/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parsedExternallyDefinedCollector } from './parsed_externally_defined_collector';
import { parsedImportedSchemaCollector } from './parsed_imported_schema';
import { parsedImportedUsageInterface } from './parsed_imported_usage_interface';
import { parsedIndexedInterfaceWithNoMatchingSchema } from './parsed_indexed_interface_with_not_matching_schema';
import { parsedNestedCollector } from './parsed_nested_collector';
import { parsedSchemaDefinedWithSpreadsCollector } from './parsed_schema_defined_with_spreads_collector';
import { parsedWorkingCollector } from './parsed_working_collector';
import { ParsedUsageCollection } from '../ts_parser';

export const allExtractedCollectors: ParsedUsageCollection[] = [
  ...parsedExternallyDefinedCollector,
  ...parsedImportedSchemaCollector,
  ...parsedImportedUsageInterface,
  parsedIndexedInterfaceWithNoMatchingSchema,
  parsedNestedCollector,
  parsedSchemaDefinedWithSpreadsCollector,
  parsedWorkingCollector,
];
