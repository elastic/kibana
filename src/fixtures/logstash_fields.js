/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { shouldReadFieldFromDocValues, castEsToKbnFieldTypeName } from '../plugins/data/server';

function stubbedLogstashFields() {
  return [
    //                                  |aggregatable
    //                                  |      |searchable
    // name               esType        |      |      |metadata       | subType
    ['bytes', 'long', true, true, { count: 10 }],
    ['ssl', 'boolean', true, true, { count: 20 }],
    ['@timestamp', 'date', true, true, { count: 30 }],
    ['time', 'date', true, true, { count: 30 }],
    ['@tags', 'keyword', true, true],
    ['utc_time', 'date', true, true],
    ['phpmemory', 'integer', true, true],
    ['ip', 'ip', true, true],
    ['request_body', 'attachment', true, true],
    ['point', 'geo_point', true, true],
    ['area', 'geo_shape', true, true],
    ['hashed', 'murmur3', false, true],
    ['geo.coordinates', 'geo_point', true, true],
    ['extension', 'text', true, true],
    ['extension.keyword', 'keyword', true, true, {}, { multi: { parent: 'extension' } }],
    ['machine.os', 'text', true, true],
    ['machine.os.raw', 'keyword', true, true, {}, { multi: { parent: 'machine.os' } }],
    ['geo.src', 'keyword', true, true],
    ['_id', '_id', true, true],
    ['_type', '_type', true, true],
    ['_source', '_source', true, true],
    ['non-filterable', 'text', true, false],
    ['non-sortable', 'text', false, false],
    ['custom_user_field', 'conflict', true, true],
    ['script string', 'text', true, false, { script: "'i am a string'" }],
    ['script number', 'long', true, false, { script: '1234' }],
    ['script date', 'date', true, false, { script: '1234', lang: 'painless' }],
    ['script murmur3', 'murmur3', true, false, { script: '1234' }],
  ].map(function (row) {
    const [name, esType, aggregatable, searchable, metadata = {}, subType = undefined] = row;

    const {
      count = 0,
      script,
      lang = script ? 'expression' : undefined,
      scripted = !!script,
    } = metadata;

    // the conflict type is actually a kbnFieldType, we
    // don't have any other way to represent it here
    const type = esType === 'conflict' ? esType : castEsToKbnFieldTypeName(esType);

    return {
      name,
      type,
      esTypes: [esType],
      readFromDocValues: shouldReadFieldFromDocValues(aggregatable, esType),
      aggregatable,
      searchable,
      count,
      script,
      lang,
      scripted,
      subType,
    };
  });
}

export default stubbedLogstashFields;
