/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import JSON5 from 'json5';
import { Serializer } from '.';

const ESCAPE_SINGLE_QUOTE_REGEX = /\\([\s\S])|(')/g;

export const serializeToJson5: Serializer = (messages, formats = i18n.formats) => {
  // .slice(0, -4): remove closing curly braces from json to append messages
  let jsonBuffer = Buffer.from(
    JSON5.stringify({ formats, messages: {} }, { quote: `'`, space: 2 }).slice(0, -4).concat('\n')
  );

  for (const [mapKey, mapValue] of messages) {
    const formattedMessage = mapValue.message.replace(ESCAPE_SINGLE_QUOTE_REGEX, '\\$1$2');
    const formattedDescription = mapValue.description
      ? mapValue.description.replace(ESCAPE_SINGLE_QUOTE_REGEX, '\\$1$2')
      : '';

    jsonBuffer = Buffer.concat([
      jsonBuffer,
      Buffer.from(`    '${mapKey}': '${formattedMessage}',`),
      Buffer.from(formattedDescription ? ` // ${formattedDescription}\n` : '\n'),
    ]);
  }

  // append previously removed closing curly braces
  jsonBuffer = Buffer.concat([jsonBuffer, Buffer.from('  },\n}\n')]);

  return jsonBuffer.toString();
};
