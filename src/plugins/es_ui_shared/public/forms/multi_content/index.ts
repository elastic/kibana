/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  MultiContentProvider,
  MultiContentConsumer,
  useMultiContentContext,
  useContent,
} from './multi_content_context';

export type { HookProps, Content, MultiContent } from './use_multi_content';
export { useMultiContent } from './use_multi_content';

export { WithMultiContent } from './with_multi_content';
