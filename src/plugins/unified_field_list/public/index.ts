/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UnifiedFieldListPlugin } from './plugin';

export type {
  FieldStatsResponse,
  BucketedAggregation,
  NumberStatsResult,
  TopValuesResult,
} from '../common/types';
export { FieldList, type FieldListProps, type FieldListGroups } from './components/field_list';
export type { FieldStatsProps, FieldStatsServices } from './components/field_stats';
export { FieldStats } from './components/field_stats';
export { loadFieldStats } from './services/field_stats';
export { loadFieldExisting } from './services/field_existing';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new UnifiedFieldListPlugin();
}
export type {
  UnifiedFieldListPluginSetup,
  UnifiedFieldListPluginStart,
  AddFieldFilterHandler,
} from './types';

export {
  useExistingFieldsFetcher,
  useExistingFieldsReader,
  getDataViewHash,
  ExistenceFetchStatus,
  type ExistingFieldsInfo,
  type FetchExistenceInfoParams,
  type ExistingFieldsReader,
} from './hooks/use_existing_fields';
