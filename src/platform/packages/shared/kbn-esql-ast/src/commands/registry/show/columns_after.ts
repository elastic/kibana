/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';

// from https://github.com/elastic/elasticsearch/blob/da50c723a43262a9f46228ca36099647706c90dd/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/plan/logical/show/ShowInfo.java#L56-L58
export const SHOW_INFO_FIELDS: ESQLFieldWithMetadata[] = [
  {
    name: 'version',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'date',
    type: 'keyword',
    userDefined: false,
  },
  {
    name: 'hash',
    type: 'keyword',
    userDefined: false,
  },
];

export const columnsAfter = () => {
  return [...SHOW_INFO_FIELDS];
};
