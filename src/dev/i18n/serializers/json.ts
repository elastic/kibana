/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Serializer } from '.';

export const serializeToJson: Serializer = (messages, formats = i18n.formats) => {
  const resultJsonObject = {
    formats,
    messages: {} as Record<string, string | { text: string; comment: string }>,
  };

  for (const [mapKey, mapValue] of messages) {
    if (mapValue.description) {
      resultJsonObject.messages[mapKey] = { text: mapValue.message, comment: mapValue.description };
    } else {
      resultJsonObject.messages[mapKey] = mapValue.message;
    }
  }

  return JSON.stringify(resultJsonObject, undefined, 2).concat('\n');
};
