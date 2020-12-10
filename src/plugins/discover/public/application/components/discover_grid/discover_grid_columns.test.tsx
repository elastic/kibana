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
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { getEuiGridColumns } from './discover_grid_columns';

describe('Discover grid columns ', function () {
  it('returns eui grid columns without time column', async () => {
    const actual = getEuiGridColumns(['extension', 'message'], {}, indexPatternMock, false, false);
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "showHide": Object {
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "extension",
          "isSortable": undefined,
          "schema": "json",
        },
        Object {
          "actions": Object {
            "showHide": Object {
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "message",
          "isSortable": undefined,
          "schema": "json",
        },
      ]
    `);
  });
  it('returns eui grid columns without time column showing default columns', async () => {
    const actual = getEuiGridColumns(['extension', 'message'], {}, indexPatternMock, false, true);
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "showHide": false,
            "showMoveLeft": false,
            "showMoveRight": false,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "extension",
          "isSortable": undefined,
          "schema": "json",
        },
        Object {
          "actions": Object {
            "showHide": false,
            "showMoveLeft": false,
            "showMoveRight": false,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "message",
          "isSortable": undefined,
          "schema": "json",
        },
      ]
    `);
  });
  it('returns eui grid columns with time column', async () => {
    const actual = getEuiGridColumns(['extension', 'message'], {}, indexPatternMock, true, false);
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "showHide": Object {
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": "Time (date)",
          "id": "date",
          "initialWidth": 180,
          "isSortable": undefined,
          "schema": "json",
        },
        Object {
          "actions": Object {
            "showHide": Object {
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "extension",
          "isSortable": undefined,
          "schema": "json",
        },
        Object {
          "actions": Object {
            "showHide": Object {
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "message",
          "isSortable": undefined,
          "schema": "json",
        },
      ]
    `);
  });
});
