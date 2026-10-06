/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMap, ESQLSingleAstItem } from '@elastic/esql/types';
import type { ESQLMessage, SupportedDataType } from '../../..';
import type { UnmappedFieldsStrategy } from '../../../registry/types';
import { type ESQLColumnData } from '../../../registry/types';
export declare const TypeMap: Record<SupportedDataType, string>;
export declare function validateMap(
  mapValue: ESQLSingleAstItem,
  mapDefinition: string
): ESQLMessage | null;
/**
 * Enforces list shape for map parameters whose item type is validated by validateMap.
 */
export declare const validateMapListParameter: (
  mapValue: ESQLMap,
  paramName: string,
  columns?: Map<string, ESQLColumnData>,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
) => ESQLMessage | null;
