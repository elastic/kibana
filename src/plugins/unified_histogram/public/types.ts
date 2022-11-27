/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Theme } from '@kbn/charts-plugin/public/plugin';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { Observable } from 'rxjs';
import { useEffect, useState } from 'react';

/**
 * The fetch status of a unified histogram request
 */
export enum UnifiedHistogramFetchStatus {
  uninitialized = 'uninitialized',
  loading = 'loading',
  partial = 'partial',
  complete = 'complete',
  error = 'error',
}

/**
 * The services required by the unified histogram components
 */
export interface UnifiedHistogramServices {
  data: DataPublicPluginStart;
  theme: Theme;
  uiSettings: IUiSettingsClient;
  fieldFormats: FieldFormatsStart;
  lens: LensPublicStart;
}

/**
 * The bucketInterval object returned by {@link buildBucketInterval}
 */
export interface UnifiedHistogramBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}

export type UnifiedHistogramAdapters = Partial<DefaultInspectorAdapters>;

/**
 * Emitted when the histogram loading status changes
 */
export interface UnifiedHistogramChartLoadEvent {
  /**
   * Inspector adapters for the request
   */
  adapters: UnifiedHistogramAdapters;
}

/**
 * Context object for requests made by unified histogram components
 */
export interface UnifiedHistogramRequestContext {
  /**
   * Current search session ID
   */
  searchSessionId?: string;
  /**
   * The adapter to use for requests (does not apply to Lens requests)
   */
  adapter?: RequestAdapter;
}

/**
 * Context object for the hits count
 */
export interface UnifiedHistogramHitsContext {
  /**
   * The fetch status of the hits count request
   */
  status?: UnifiedHistogramFetchStatus;
  /**
   * The total number of hits
   */
  total?: number;
}

/**
 * Context object for the chart
 */
export interface UnifiedHistogramChartContext {
  /**
   * Controls whether or not the chart is hidden
   */
  hidden?: boolean;
  /**
   * Controls the time interval of the chart
   */
  timeInterval?: string;
  /**
   * The chart title -- sets the title property on the Lens chart input
   */
  title?: string;
}

/**
 * Context object for the histogram breakdown
 */
export interface UnifiedHistogramBreakdownContext {
  /**
   * The field used for the breakdown
   */
  field?: DataViewField;
}

type MessagePlain = { type: string };
type MessagePayload<T> = MessagePlain & { payload: T };
type Message<T = void> = T extends void ? MessagePlain : MessagePayload<T>;

type FetchMessage = { type: 'fetch' };
type CoffeeMessage = { type: 'coffee'; payload: { amount: number } };
type CombinedMessage = FetchMessage | CoffeeMessage;

const messageIsType = <
  TMessageCombined extends Message,
  TType extends TMessageCombined['type'],
  TMessage extends Extract<TMessageCombined, { type: TType }>,
  TPayload extends TMessage extends MessagePayload<any> ? TMessage['payload'] : never
>(
  message: TMessageCombined,
  type: TType
): message is TMessage & { payload: TPayload } => {
  return message.type === type;
};

const msg = { type: 'coffee', payload: { amount: 2 } } as CombinedMessage;

if (messageIsType(msg, 'coffee')) {
  msg.payload.amount = 5;
}

export const messageTest = <
  TMessageCombined extends Message,
  TType extends TMessageCombined['type'],
  TMessage extends Extract<TMessageCombined, { type: TType }>,
  TPayload extends TMessage extends MessagePayload<any> ? TMessage['payload'] : never
>(
  message$: Observable<TMessageCombined>,
  type: TType,
  callback: (payload: TPayload) => void
) => {
  message$.subscribe((message) => {
    if (messageIsType(message, type)) {
      callback(message.payload);
    }
  });
};

messageTest(new Observable<CombinedMessage>(), 'coffee', (a) => {});
messageTest(new Observable<CombinedMessage>(), 'fetch', (a) => {});
messageTest(new Observable<CombinedMessage>(), 'bleh', (a) => {});

type UnifiedMessage<TType extends string, TPayload = void> = TPayload extends void
  ? { type: TType }
  : { type: TType; payload: TPayload };

type UnifiedMessageObservable<TType extends string, TPayLoad = void> = Observable<
  UnifiedMessage<TType, TPayLoad>
>;

export const useMessage = <TType extends string, TPayLoad = void>(
  message$: UnifiedMessageObservable<TType, TPayLoad> | undefined,
  type: TType,
  callback: (payload: TPayLoad) => void
) => {
  useEffect(() => {
    const subscription = message$?.subscribe((message) => {
      if (message.type === type) {
        callback((message as { payload: TPayLoad }).payload);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [message$, type, callback]);
};

export const useMessageData = <TType extends string, TPayLoad = void>(
  message$: UnifiedMessageObservable<TType, TPayLoad> | undefined,
  type: TType
): TPayLoad | undefined => {
  const [data, setData] = useState<TPayLoad>();
  useMessage(message$, type, setData);
  return data;
};

export type UnifiedHistogramRefetchMessage = UnifiedMessage<'refetch'>;

export type UnifiedHistogramCofeeMessage = UnifiedMessage<
  'makeCoffee',
  { temperature: 'cold' | 'warm' | 'hot' }
>;

export type UnifiedHistogramInputMessage =
  | UnifiedHistogramRefetchMessage
  | UnifiedHistogramCofeeMessage;

export type UnifiedHistogramInput$ = Observable<UnifiedHistogramInputMessage>;
