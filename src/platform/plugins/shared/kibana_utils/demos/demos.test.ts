/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { result as counterResult } from './state_containers/counter';
import { result as todomvcResult } from './state_containers/todomvc';
import { result as urlSyncResult } from './state_sync/url';

describe('demos', () => {
  describe('state containers', () => {
    test('counter demo works', () => {
      expect(counterResult).toBe(10);
    });

    test('TodoMVC demo works', () => {
      expect(todomvcResult).toEqual([
        { id: 0, text: 'Learning state containers', completed: true },
        { id: 1, text: 'Learning transitions...', completed: true },
      ]);
    });
  });

  describe('state sync', () => {
    test('url sync demo works', async () => {
      expect(await urlSyncResult).toMatchInlineSnapshot(
        `"http://localhost/#?_s=(todos:!((completed:!f,id:0,text:'Learning%20state%20containers'),(completed:!f,id:2,text:test)))"`
      );
    });
  });
});
