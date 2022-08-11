/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/110891
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext } from '@kbn/core/public';
import { DefaultEditorController } from './default_editor_controller';
import { VisDefaultEditorPlugin } from './plugin';

export { DefaultEditorController };
export { useValidation } from './components/controls/utils';
export { PalettePicker } from './components/controls/palette_picker';
export * from './components/options';
export type { RangeValues } from './components/controls/ranges';
export { RangesParamEditor } from './components/controls/ranges';
export * from './editor_size';
export * from './utils';

export const plugin = (context: PluginInitializerContext) => {
  return new VisDefaultEditorPlugin();
};
