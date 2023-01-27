/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { removeCompilerOption, setCompilerOption } from './src/compiler_options';
export {
  addReferences,
  removeReferences,
  replaceReferences,
  removeAllReferences,
} from './src/references';
export { setExtends } from './src/extends';
export { setProp } from './src/props';
export { snip } from './src/snip';
