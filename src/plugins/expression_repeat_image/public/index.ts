/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/110893
/* eslint-disable @kbn/eslint/no_export_all */

import { ExpressionRepeatImagePlugin } from './plugin';

export type { ExpressionRepeatImagePluginSetup, ExpressionRepeatImagePluginStart } from './plugin';

export function plugin() {
  return new ExpressionRepeatImagePlugin();
}

export * from './expression_renderers';
