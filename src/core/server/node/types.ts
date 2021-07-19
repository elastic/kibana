/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableLogRecord } from '@kbn/logging';
import { Serializable } from '../../types';

/** @public */
export type NodeMessagePayload = Serializable;

export interface BroadcastOptions {
  /**
   * If true, will also send the broadcast message to the worker that sent it.
   * Defaults to false.
   */
  sendToSelf?: boolean;
}

/** @internal */
export interface TransferBroadcastMessage {
  _kind: 'kibana-broadcast';
  type: string;
  payload?: NodeMessagePayload;
  options?: BroadcastOptions;
}

/** @internal */
export interface LogRecordMessage {
  _kind: 'kibana-log-record';
  payload: SerializableLogRecord;
}

/** @public */
export type MessageHandler = (payload: NodeMessagePayload | undefined) => void;

/** @public */
export type MessageHandlerUnsubscribeFn = () => void;
