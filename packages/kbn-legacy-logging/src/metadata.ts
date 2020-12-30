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

import { isPlainObject } from 'lodash';

export const metadataSymbol = Symbol('log message with metadata');

export interface EventData {
  [metadataSymbol]?: EventMetadata;
  [key: string]: any;
}

export interface EventMetadata {
  message: string;
  metadata: Record<string, any>;
}

export const isEventData = (eventData: EventData) => {
  return Boolean(isPlainObject(eventData) && eventData[metadataSymbol]);
};

export const getLogEventData = (eventData: EventData) => {
  const { message, metadata } = eventData[metadataSymbol]!;
  return {
    ...metadata,
    message,
  };
};

export const attachMetaData = (message: string, metadata: Record<string, any> = {}) => {
  return {
    [metadataSymbol]: {
      message,
      metadata,
    },
  };
};
