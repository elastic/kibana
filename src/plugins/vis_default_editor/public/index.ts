/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { DefaultEditorController } from './default_editor_controller';
import { VisDefaultEditorPlugin } from './plugin';

export { DefaultEditorController };
export { useValidation } from './components/controls/utils';
export { PalettePicker } from './components/controls/palette_picker';
export {
  SwitchOption,
  TextInputOption,
  RangeOption,
  SelectOption,
  ColorSchemaOptions,
  PercentageModeOption,
  NumberInputOption,
  RequiredNumberInputOption,
  LongLegendOptions,
  LegendSizeSettings,
  ColorRanges,
  BasicOptions,
  type SetColorRangeValue,
  type NumberInputOptionProps,
  type SetColorSchemaOptionsValue,
} from './components/options';
export type { RangeValues } from './components/controls/ranges';
export { RangesParamEditor } from './components/controls/ranges';
export { groupAndSortBy } from './utils';
export { DefaultEditorSize } from './editor_size';

export const plugin = (context: PluginInitializerContext) => {
  return new VisDefaultEditorPlugin();
};
