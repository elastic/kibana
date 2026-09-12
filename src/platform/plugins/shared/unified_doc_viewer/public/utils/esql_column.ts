/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import type { ESQLColumn } from '@elastic/esql/types';

/**
 * Builds a column reference from a dotted field name. The segments are passed
 * separately so each one is quoted on its own; handing `esql.col` the whole
 * name would emit a single backtick-quoted identifier instead.
 *
 * Callers pass an already-validated field name: an empty segment prints as an
 * empty backtick-quoted identifier (`` `` ``), which Elasticsearch rejects.
 */
export const esqlColumn = (field: string): ESQLColumn => esql.col(field.split('.'));
