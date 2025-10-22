/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnhancementsRegistry } from './registry';

describe('enhancements registry', () => {
  const registry = new EnhancementsRegistry();

  beforeAll(() => {
    registry.registerEnhancement({
      id: 'testEnhancement',
      extract: jest.fn().mockReturnValue({
        state: {
          linkedRefName: 'ref1',
        },
        references: [
          {
            type: 'testRefType',
            id: '1234',
            name: 'ref1',
          },
        ],
      }),
      inject: jest.fn().mockReturnValue({ linkedId: '1234' }),
    });
  });

  describe('transformIn', () => {
    test('should extract references', () => {
      const enhancements = {
        testEnhancement: {
          linkedId: '1234',
        },
      };
      expect(registry.transformIn(enhancements)).toMatchInlineSnapshot(`
        Object {
          "enhancementsReferences": Array [
            Object {
              "id": "1234",
              "name": "ref1",
              "type": "testRefType",
            },
          ],
          "enhancementsState": Object {
            "testEnhancement": Object {
              "linkedRefName": "ref1",
            },
          },
        }
      `);
    });

    test('should return incoming state when there is no state manager for the enhancement', () => {
      const enhancements = {
        someOtherEnhancement: {
          moreState: 'hello',
        },
      };
      // there is no enhancment registered for `someOtherEnhancement`
      // but transformIn should return original `someOtherEnhancement` state
      const { enhancementsReferences, enhancementsState } = registry.transformIn(enhancements);
      expect(enhancementsReferences).toEqual([]);
      expect(enhancementsState).toEqual(enhancements);
    });
  });

  describe('transformOut', () => {
    test('should inject references', () => {
      expect(
        registry.transformOut(
          {
            testEnhancement: {
              linkedRefName: 'ref1',
            },
          },
          [
            {
              type: 'testRefType',
              id: '1234',
              name: 'ref1',
            },
          ]
        )
      ).toMatchInlineSnapshot(`
        Object {
          "testEnhancement": Object {
            "linkedId": "1234",
          },
        }
      `);
    });

    test('should return incoming state when there is no state manager for the enhancement', () => {
      const enhancements = {
        someOtherEnhancement: {
          moreState: 'hello',
        },
      };
      // there is no enhancment registered for `someOtherEnhancement`
      // but transformIn should return original `someOtherEnhancement` state
      expect(registry.transformOut(enhancements, [])).toEqual(enhancements);
    });
  });
});
