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
export type { TodoEmbeddableFactory } from './todo';
export { TODO_EMBEDDABLE } from './todo';

export { BOOK_EMBEDDABLE } from './book';

export { SIMPLE_EMBEDDABLE } from './migrations';

import { EmbeddableExamplesPlugin } from './plugin';

export type { SearchableListContainerFactory } from './searchable_list_container';
export { SearchableListContainer, SEARCHABLE_LIST_CONTAINER } from './searchable_list_container';
export type { MultiTaskTodoEmbeddableFactory } from './multi_task_todo';
export { MULTI_TASK_TODO_EMBEDDABLE } from './multi_task_todo';
export const plugin = () => new EmbeddableExamplesPlugin();
