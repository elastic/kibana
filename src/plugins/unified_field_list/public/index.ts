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
export type { FieldStatsProps, FieldStatsServices } from './components/field_stats';
export { FieldStats } from './components/field_stats';
export {
  FieldPopover,
  type FieldPopoverProps,
  FieldPopoverHeader,
  type FieldPopoverHeaderProps,
  FieldPopoverVisualize,
  type FieldPopoverVisualizeProps,
} from './components/field_popover';
export {
  FieldVisualizeButton,
  type FieldVisualizeButtonProps,
  getVisualizeInformation,
  triggerVisualizeActions,
  triggerVisualizeActionsTextBasedLanguages,
  type VisualizeInformation,
} from './components/field_visualize_button';
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
