/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { designerUiComment } from './saved_objects/designer_ui_comment';

export type DesignerToolbarConfigType = {
  enabled: boolean;
};

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
});

export const config: PluginConfigDescriptor<DesignerToolbarConfigType> = {
  exposeToBrowser: { enabled: true },
  schema: configSchema,
};

// eslint-disable-next-line import/no-default-export
export default function createPlugin(_context: PluginInitializerContext) {
  return {
    setup(core: import('@kbn/core/server').CoreSetup) {
      core.savedObjects.registerType(designerUiComment);
    },
    start() {},
  };
}

export const plugin = createPlugin;
