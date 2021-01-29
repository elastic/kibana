/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
