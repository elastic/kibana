/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { ContentClientProvider, ContentClient } from '@kbn/content-management-plugin/public';
import { ContentTypeRegistry } from '@kbn/content-management-plugin/public/registry';

import { Todos } from '../todos';
import { TodosClient } from './todos_client';

export default {
  title: 'Content Management/Demo/Todo',
  description: 'A demo todo app that uses content management',
  parameters: {},
};

const todosClient = new TodosClient();

const contentTypeRegistry = new ContentTypeRegistry();
contentTypeRegistry.register({ id: 'todos', version: { latest: 1 } });

const contentClient = new ContentClient((contentType?: string) => {
  switch (contentType) {
    case 'todos':
      return todosClient;

    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }
}, contentTypeRegistry);

export const SimpleTodoApp = () => (
  <ContentClientProvider contentClient={contentClient}>
    <Todos />
  </ContentClientProvider>
);
