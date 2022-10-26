/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fitToBox } from './image_metadata';
describe('util', () => {
  describe('fitToBox', () => {
    test('300x300', () => {
      expect(fitToBox(300, 300)).toMatchInlineSnapshot(`
        Object {
          "height": 300,
          "width": 300,
        }
      `);
    });

    test('300x150', () => {
      expect(fitToBox(300, 150)).toMatchInlineSnapshot(`
        Object {
          "height": 150,
          "width": 300,
        }
      `);
    });

    test('4500x9000', () => {
      expect(fitToBox(4500, 9000)).toMatchInlineSnapshot(`
        Object {
          "height": 300,
          "width": 150,
        }
      `);
    });

    test('1000x300', () => {
      expect(fitToBox(1000, 300)).toMatchInlineSnapshot(`
        Object {
          "height": 90,
          "width": 300,
        }
      `);
    });

    test('0x0', () => {
      expect(fitToBox(0, 0)).toMatchInlineSnapshot(`
        Object {
          "height": 0,
          "width": 0,
        }
      `);
    });
  });
});
