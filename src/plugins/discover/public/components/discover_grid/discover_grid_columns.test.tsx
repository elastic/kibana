/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { indexPatternMock } from '../../__mocks__/index_pattern';
import { getEuiGridColumns } from './discover_grid_columns';
import { indexPatternWithTimefieldMock } from '../../__mocks__/index_pattern_with_timefield';

describe('Discover grid columns', function () {
  it('returns eui grid columns without time column', async () => {
    const actual = getEuiGridColumns(
      ['extension', 'message'],
      {},
      indexPatternMock,
      false,
      false,
      true
    );
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "additional": Array [
              Object {
                "iconProps": Object {
                  "size": "m",
                },
                "iconType": "copyClipboard",
                "label": <FormattedMessage
                  defaultMessage="Copy to clipboard"
                  id="discover.grid.copyToClipBoardButton"
                  values={Object {}}
                />,
                "onClick": [Function],
                "size": "xs",
              },
            ],
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
            "additional": Array [
              Object {
                "iconProps": Object {
                  "size": "m",
                },
                "iconType": "copyClipboard",
                "label": <FormattedMessage
                  defaultMessage="Copy to clipboard"
                  id="discover.grid.copyToClipBoardButton"
                  values={Object {}}
                />,
                "onClick": [Function],
                "size": "xs",
              },
            ],
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
      true,
      true
    );
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "additional": Array [
              Object {
                "iconProps": Object {
                  "size": "m",
                },
                "iconType": "copyClipboard",
                "label": <FormattedMessage
                  defaultMessage="Copy to clipboard"
                  id="discover.grid.copyToClipBoardButton"
                  values={Object {}}
                />,
                "onClick": [Function],
                "size": "xs",
              },
            ],
            "showHide": false,
            "showMoveLeft": false,
            "showMoveRight": false,
          },
          "cellActions": Array [
            [Function],
            [Function],
          ],
          "display": undefined,
          "id": "extension",
          "isSortable": false,
          "schema": "string",
        },
        Object {
          "actions": Object {
            "additional": Array [
              Object {
                "iconProps": Object {
                  "size": "m",
                },
                "iconType": "copyClipboard",
                "label": <FormattedMessage
                  defaultMessage="Copy to clipboard"
                  id="discover.grid.copyToClipBoardButton"
                  values={Object {}}
                />,
                "onClick": [Function],
                "size": "xs",
              },
            ],
            "showHide": false,
            "showMoveLeft": false,
            "showMoveRight": false,
          },
          "cellActions": undefined,
          "display": undefined,
          "id": "message",
          "isSortable": false,
          "schema": "string",
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
      false,
      true
    );
    expect(actual).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions": Object {
            "additional": Array [
              Object {
                "iconProps": Object {
                  "size": "m",
                },
                "iconType": "copyClipboard",
                "label": <FormattedMessage
                  defaultMessage="Copy to clipboard"
                  id="discover.grid.copyToClipBoardButton"
                  values={Object {}}
                />,
                "onClick": [Function],
                "size": "xs",
              },
            ],
            "showHide": false,
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": Array [
            [Function],
            [Function],
          ],
          "display": <React.Fragment>
            timestamp
             
            <EuiIconTip
              aria-label="Primary time field."
              content="This field represents the time that events occurred."
              iconProps={
                Object {
                  "tabIndex": -1,
                }
              }
              type="clock"
            />
          </React.Fragment>,
          "id": "timestamp",
          "initialWidth": 190,
          "isSortable": true,
          "schema": "datetime",
        },
        Object {
          "actions": Object {
            "additional": Array [
              Object {
                "iconProps": Object {
                  "size": "m",
                },
                "iconType": "copyClipboard",
                "label": <FormattedMessage
                  defaultMessage="Copy to clipboard"
                  id="discover.grid.copyToClipBoardButton"
                  values={Object {}}
                />,
                "onClick": [Function],
                "size": "xs",
              },
            ],
            "showHide": Object {
              "iconType": "cross",
              "label": "Remove column",
            },
            "showMoveLeft": true,
            "showMoveRight": true,
          },
          "cellActions": Array [
            [Function],
            [Function],
          ],
          "display": undefined,
          "id": "extension",
          "isSortable": false,
          "schema": "string",
        },
        Object {
          "actions": Object {
            "additional": Array [
              Object {
                "iconProps": Object {
                  "size": "m",
                },
                "iconType": "copyClipboard",
                "label": <FormattedMessage
                  defaultMessage="Copy to clipboard"
                  id="discover.grid.copyToClipBoardButton"
                  values={Object {}}
                />,
                "onClick": [Function],
                "size": "xs",
              },
            ],
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
          "schema": "string",
        },
      ]
    `);
  });
});
