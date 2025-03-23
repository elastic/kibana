/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParsedUsageCollection } from '../ts_parser';
import { parsedExternallyDefinedCollector } from './parsed_externally_defined_collector';
import { parsedImportedSchemaCollector } from './parsed_imported_schema';
import { parsedImportedUsageInterface } from './parsed_imported_usage_interface';
import { parsedIndexedInterfaceWithNoMatchingSchema } from './parsed_indexed_interface_with_not_matching_schema';
import { parsedNestedCollector } from './parsed_nested_collector';
import { parsedSchemaDefinedWithSpreadsCollector } from './parsed_schema_defined_with_spreads_collector';
import { parsedWorkingCollector } from './parsed_working_collector';
import { parsedCollectorWithDescription } from './parsed_working_collector_with_description';
import { parsedStatsCollector } from './parsed_stats_collector';
import { parsedImportedInterfaceFromExport } from './parsed_imported_interface_from_export';
import { parsedEnumCollector } from './parsed_enum_collector';

export const allExtractedCollectors: ParsedUsageCollection[] = [
  ...parsedExternallyDefinedCollector,
  ...parsedImportedInterfaceFromExport,
  ...parsedImportedSchemaCollector,
  ...parsedImportedUsageInterface,
  parsedIndexedInterfaceWithNoMatchingSchema,
  parsedNestedCollector,
  parsedSchemaDefinedWithSpreadsCollector,
  ...parsedStatsCollector,
  parsedCollectorWithDescription,
  parsedWorkingCollector,
  parsedEnumCollector,
];
