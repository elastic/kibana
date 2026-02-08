/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isObj } from './parse_helpers';

const PLUGIN_CATEGORY = Symbol('pluginCategory');

const isValidPluginCategoryInfo = (v: unknown): boolean =>
  isObj(v) &&
  typeof (v as any).oss === 'boolean' &&
  typeof (v as any).example === 'boolean' &&
  typeof (v as any).testPlugin === 'boolean';

export { PLUGIN_CATEGORY, isValidPluginCategoryInfo };
