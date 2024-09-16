/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EntryExists,
  EntryList,
  EntryMatch,
  EntryMatchAny,
  EntryMatchWildcard,
  EntryNested,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ElementType } from 'react';

export type Entry =
  | EntryExists
  | EntryList
  | EntryMatch
  | EntryMatchAny
  | EntryMatchWildcard
  | EntryNested;

export type Entries = ExceptionListItemSchema['entries'];
export interface CriteriaConditionsProps {
  entries: Entries;
  dataTestSubj: string;
  os?: ExceptionListItemSchema['os_types'];
  showValueListModal: ElementType;
}
