/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaultEnFormats } from '@kbn/i18n/src/core';
import { Serializer, FileOutput } from './types';

export const serializeToJson: Serializer = (messages, formats = defaultEnFormats) => {
  const resultJsonObject: FileOutput = {
    formats,
    messages: {},
  };

  for (const { id, defaultMessage, description } of messages) {
    if (typeof id !== 'string' || typeof defaultMessage !== 'string') {
      throw new Error(`Unexpected message inputs, id: ${id} message: ${defaultMessage}`);
    }

    if (description && typeof description === 'string') {
      resultJsonObject.messages[id] = { text: defaultMessage, comment: description };
    } else {
      resultJsonObject.messages[id] = defaultMessage;
    }
  }

  return JSON.stringify(resultJsonObject, undefined, 2).concat('\n');
};
