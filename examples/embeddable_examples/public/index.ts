/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { HelloWorldEmbeddableFactory } from './hello_world';
export {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddable,
  HelloWorldEmbeddableFactoryDefinition,
} from './hello_world';
export type { ListContainerFactory } from './list_container';
export { ListContainer, LIST_CONTAINER } from './list_container';

export { SIMPLE_EMBEDDABLE } from './migrations';
export {
  FILTER_DEBUGGER_EMBEDDABLE,
  FilterDebuggerEmbeddableFactoryDefinition,
} from './filter_debugger';

import { EmbeddableExamplesPlugin } from './plugin';

export const plugin = () => new EmbeddableExamplesPlugin();
