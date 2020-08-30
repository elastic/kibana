/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Types for JSON-Rx messages, see: https://onp4.com/@vadim/p/gv9z33hjuo
 */

/** Must be positive integer. */
export type RpcId = number;

/** Must be non-empty string, no longer than 128 characters. */
export type RpcMethod = string;

export type RpcMessageSubscribe = [RpcId, RpcMethod, unknown];

export type RpcMessageComplete = [0, RpcId, unknown];

export type RpcMessageError = [-1, RpcId, unknown];

export type RpcMessageNotification = RpcMethod | [RpcMethod, unknown];

export type RpcMessageData = [-2, RpcId, unknown];

export type RpcMessageUnsubscribe = [-3, RpcId];

export type RpcMessage =
  | RpcMessageSubscribe
  | RpcMessageUnsubscribe
  | RpcMessageData
  | RpcMessageUnsubscribe
  | RpcMessageError
  | RpcMessageNotification;
