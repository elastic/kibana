/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { DefaultEditorController } from './default_editor_controller';
export { useValidation } from './components/controls/utils';
export { RangesParamEditor, RangeValues } from './components/controls/ranges';
export * from './editor_size';
export * from './vis_options_props';
export * from './utils';
export { ISchemas, Schemas, Schema } from './schemas';

/** dummy plugin, we just want visDefaultEditor to have its own bundle */
export function plugin() {
  return new (class VisDefaultEditor {
    setup() {}
    start() {}
  })();
}
