/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectMapPropsIntoSpec } from './vsi_helper';
import { VegaSpec } from '../../../data_model/types';

describe('vega_map_view/vsi_helper', () => {
  describe('injectMapPropsIntoSpec', () => {
    test('should inject map properties into vega spec', () => {
      const spec = {
        $schema: 'https://vega.github.io/schema/vega/v5.json',
        config: {
          kibana: { type: 'map', latitude: 25, longitude: -70, zoom: 3 },
        },
      } as unknown as VegaSpec;

      expect(injectMapPropsIntoSpec(spec)).toMatchInlineSnapshot(`
        Object {
          "$schema": "https://vega.github.io/schema/vega/v5.json",
          "autosize": "none",
          "config": Object {
            "kibana": Object {
              "latitude": 25,
              "longitude": -70,
              "type": "map",
              "zoom": 3,
            },
          },
          "projections": Array [
            Object {
              "center": Array [
                0,
                Object {
                  "signal": "latitude",
                },
              ],
              "fit": false,
              "name": "projection",
              "rotate": Array [
                Object {
                  "signal": "-longitude",
                },
                0,
                0,
              ],
              "scale": Object {
                "signal": "512*pow(2,zoom)/2/PI",
              },
              "translate": Array [
                Object {
                  "signal": "width/2",
                },
                Object {
                  "signal": "height/2",
                },
              ],
              "type": "mercator",
            },
          ],
          "signals": Array [
            Object {
              "name": "zoom",
            },
            Object {
              "name": "latitude",
            },
            Object {
              "name": "longitude",
            },
          ],
        }
      `);
    });
  });
});
