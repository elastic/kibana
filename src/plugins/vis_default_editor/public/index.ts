/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { DefaultEditorController } from './default_editor_controller';
import { VisDefaultEditorPlugin } from './plugin';

export { DefaultEditorController };
export { useValidation } from './components/controls/utils';
export { PalettePicker } from './components/controls/palette_picker';
export * from './components/options';
export { RangesParamEditor, RangeValues } from './components/controls/ranges';
export * from './editor_size';
export * from './vis_options_props';
export * from './utils';

export const plugin = (context: PluginInitializerContext) => {
  return new VisDefaultEditorPlugin();
};
