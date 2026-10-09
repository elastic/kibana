/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '@elastic/esql';
import type { ESQLColumn } from '@elastic/esql/types';
import { isSingleSource } from '@kbn/esql-utils';

// Falls back to the metric's backing index unless the user's source is a single concrete index.
export const resolveSource = (originalSource: string | undefined, indexName: string): string =>
  isSingleSource(originalSource) ? originalSource : indexName;

// Builds an escaped ES|QL column node from a dotted field name
export const fieldNameToColumn = (fieldName: string): ESQLColumn => synth.col(fieldName.split('.'));
