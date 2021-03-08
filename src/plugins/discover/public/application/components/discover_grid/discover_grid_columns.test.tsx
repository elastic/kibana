/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { getEuiGridColumns } from './discover_grid_columns';
import { indexPatternWithTimefieldMock } from '../../../__mocks__/index_pattern_with_timefield';

describe('Discover grid columns ', function () {
  it('returns eui grid columns without time column', async () => {
    const actual = getEuiGridColumns(['extension', 'message'], {}, indexPatternMock, false, false);
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "showHide": Object {
              "iconType": "cross",
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "extension",
          "isSortable": false,
          "schema": "kibana-json",
        },
        Object {
          "actions": Object {
            "showHide": Object {
              "iconType": "cross",
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "message",
          "isSortable": false,
          "schema": "kibana-json",
        },
      ]
    `);
  });
  it('returns eui grid columns without time column showing default columns', async () => {
    const actual = getEuiGridColumns(
      ['extension', 'message'],
      {},
      indexPatternWithTimefieldMock,
      false,
      true
    );
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
          "isSortable": false,
          "schema": "kibana-json",
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
          "isSortable": false,
          "schema": "kibana-json",
        },
      ]
    `);
  });
  it('returns eui grid columns with time column', async () => {
    const actual = getEuiGridColumns(
      ['extension', 'message'],
      {},
      indexPatternWithTimefieldMock,
      true,
      false
    );
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "showHide": false,
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": "Time (timestamp)",
          "id": "timestamp",
          "initialWidth": 180,
          "isSortable": false,
          "schema": "kibana-json",
        },
        Object {
          "actions": Object {
            "showHide": Object {
              "iconType": "cross",
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "extension",
          "isSortable": false,
          "schema": "kibana-json",
        },
        Object {
          "actions": Object {
            "showHide": Object {
              "iconType": "cross",
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "message",
          "isSortable": false,
          "schema": "kibana-json",
        },
      ]
    `);
  });
});
