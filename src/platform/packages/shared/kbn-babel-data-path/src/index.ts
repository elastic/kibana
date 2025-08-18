/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { addDataPathAttributePlugin } from './babel';
export { encodeAttribute } from './encode_attribute';
export { decodeAttribute } from './decode_attribute';
export { DATA_PATH_ATTRIBUTE_KEY, TOKENS } from './constants';

export type { PluginOptions, PluginState, AddDataPathAttributeOptions } from './types';
