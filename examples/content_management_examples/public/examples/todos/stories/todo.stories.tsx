/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { ContentClientProvider, ContentClient } from '@kbn/content-management-plugin/public';

import { Todos } from '../todos';
import { TodosClient } from './todos_client';

export default {
  title: 'Content Management/Demo/Todo',
  description: 'A demo todo app that uses content management',
  parameters: {},
};

const todosClient = new TodosClient();
const contentClient = new ContentClient((contentType: string) => {
  switch (contentType) {
    case 'todos':
      return todosClient;

    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }
});

export const SimpleTodoApp = () => (
  <ContentClientProvider contentClient={contentClient}>
    <Todos />
  </ContentClientProvider>
);
