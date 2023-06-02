/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizationUiComponentsPlugin } from './plugin';

export {
  FieldPicker,
  TruncatedLabel,
  NameInput,
  DebouncedInput,
  useDebouncedValue,
  TooltipWrapper,
  ColorPicker,
  IconSelect,
  IconSelectSetting,
  NewBucketButton,
  DragDropBuckets,
  DraggableBucketContainer,
  FieldsBucketContainer,
  FilterQueryInput,
  QueryInput,
  validateQuery,
  isQueryValid,
  DimensionEditorSection,
  DimensionButton,
} from './components';

export type {
  DataType,
  FieldOptionValue,
  FieldOption,
  IconSet,
  AccessorConfig,
} from './components';

export function plugin() {
  return new VisualizationUiComponentsPlugin();
}
