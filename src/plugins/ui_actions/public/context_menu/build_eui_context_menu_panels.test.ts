/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { buildContextMenuForActions } from './build_eui_context_menu_panels';
import { Action, createAction } from '../actions';

const createTestAction = ({
  type,
  dispayName,
  order,
}: {
  type: string;
  dispayName: string;
  order: number;
}) =>
  createAction({
    type: type as any, // mapping doesn't matter for this test
    getDisplayName: () => dispayName,
    order,
    execute: async () => {},
  });

test('contextMenu actions sorting: order, type, displayName', async () => {
  const actions: Action[] = [
    createTestAction({
      order: 100,
      type: '1',
      dispayName: 'a',
    }),
    createTestAction({
      order: 100,
      type: '1',
      dispayName: 'b',
    }),
    createTestAction({
      order: 0,
      type: '2',
      dispayName: 'c',
    }),
    createTestAction({
      order: 0,
      type: '2',
      dispayName: 'd',
    }),
    createTestAction({
      order: 0,
      type: '3',
      dispayName: 'aa',
    }),
  ].sort(() => 0.5 - Math.random());

  const result = await buildContextMenuForActions({
    actions: actions.map((action) => ({ action, context: {}, trigger: '' as any })),
  });

  expect(result.items?.map((item) => item.name as string)).toMatchInlineSnapshot(`
    Array [
      "a",
      "b",
      "c",
      "d",
      "aa",
    ]
  `);
});
