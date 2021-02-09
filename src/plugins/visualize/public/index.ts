/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { VisualizePlugin, VisualizePluginSetup } from './plugin';

export { VisualizeConstants } from './application/visualize_constants';

export { IEditorController, EditorRenderProps } from './application/types';

export { VisualizePluginSetup };

export const plugin = (context: PluginInitializerContext) => {
  return new VisualizePlugin(context);
};
