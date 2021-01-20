/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Transform } from 'stream';

export function createFilterRecordsStream(type: string) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,

    transform(record, enc, callback) {
      if (record && record.type === type) {
        callback(undefined, record);
      } else {
        callback();
      }
    },
  });
}
