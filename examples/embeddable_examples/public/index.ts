/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddable,
  HelloWorldEmbeddableFactoryDefinition,
  HelloWorldEmbeddableFactory,
} from './hello_world';
export { ListContainer, LIST_CONTAINER, ListContainerFactory } from './list_container';
export { TODO_EMBEDDABLE, TodoEmbeddableFactory } from './todo';

export { BOOK_EMBEDDABLE } from './book';

import { EmbeddableExamplesPlugin } from './plugin';

export {
  SearchableListContainer,
  SEARCHABLE_LIST_CONTAINER,
  SearchableListContainerFactory,
} from './searchable_list_container';
export { MULTI_TASK_TODO_EMBEDDABLE, MultiTaskTodoEmbeddableFactory } from './multi_task_todo';
export const plugin = () => new EmbeddableExamplesPlugin();
