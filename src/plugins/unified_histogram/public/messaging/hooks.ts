/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import type { Observable } from 'rxjs';
import type { UnifiedDataMessage, UnifiedMessage } from './types';
import { messageIsType } from './utils';

export const useMessage = <
  TMessageUnion extends UnifiedMessage,
  TType extends TMessageUnion['type'],
  TMessage extends Extract<TMessageUnion, { type: TType }>,
  TPayload extends TMessage extends UnifiedDataMessage<any> ? TMessage['payload'] : never
>(
  message$: Observable<TMessageUnion | undefined> | undefined,
  type: TType,
  callback: (payload: TPayload) => void
) => {
  useEffect(() => {
    const subscription = message$?.subscribe((message) => {
      if (messageIsType(message, type)) {
        callback(message.payload);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [message$, type, callback]);
};

export const useMessageData = <
  TMessageUnion extends UnifiedMessage,
  TType extends TMessageUnion['type'],
  TMessage extends Extract<TMessageUnion, { type: TType }>,
  TPayload extends TMessage extends UnifiedDataMessage<any> ? TMessage['payload'] : never
>(
  message$: Observable<TMessageUnion | undefined> | undefined,
  type: TType
): TPayload | undefined => {
  const [data, setData] = useState<TPayload>();
  useMessage(message$, type, setData);
  return data;
};
