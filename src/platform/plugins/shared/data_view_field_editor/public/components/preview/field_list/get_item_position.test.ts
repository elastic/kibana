/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { documentFieldMock } from './field_list.mocks';
import { getPositionAfterToggling } from './get_item_position';

describe('getPositionAfterToggling', () => {
  describe('when the field goes from pinned to unpinned', () => {
    describe('when there are no other pinned fields', () => {
      it.each([
        {
          fieldList: [documentFieldMock({ key: 'field1', isPinned: true })],
          fieldName: 'field1',
          pinnedFields: { field1: true },
          expectedPosition: 0,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: false }),
          ],
          fieldName: 'field1',
          pinnedFields: { field1: true },
          expectedPosition: 0,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: false }),
            documentFieldMock({ key: 'field2', isPinned: true }),
          ],
          fieldName: 'field2',
          pinnedFields: { field2: true },
          expectedPosition: 1,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: false }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: false }),
          ],
          fieldName: 'field2',
          pinnedFields: { field2: true },
          expectedPosition: 1,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: false }),
            documentFieldMock({ key: 'field2', isPinned: false }),
            documentFieldMock({ key: 'field3', isPinned: true }),
          ],
          fieldName: 'field3',
          pinnedFields: { field3: true },
          expectedPosition: 2,
        },
      ])(
        'should return $expectedPosition',
        ({ fieldList, fieldName, pinnedFields, expectedPosition }) => {
          const result = getPositionAfterToggling(
            fieldName,
            pinnedFields as unknown as Record<string, boolean>,
            fieldList
          );
          expect(result).toBe(expectedPosition);
        }
      );
    });

    describe('when there are other pinned fields', () => {
      it.each([
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
          ],
          fieldName: 'field1',
          pinnedFields: { field1: true, field2: true },
          expectedPosition: 1,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: true }),
          ],
          fieldName: 'field1',
          pinnedFields: { field1: true, field2: true, field3: true },
          expectedPosition: 2,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: true }),
            documentFieldMock({ key: 'field4', isPinned: false }),
          ],
          fieldName: 'field1',
          pinnedFields: { field1: true, field2: true, field3: true },
          expectedPosition: 2,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: true }),
          ],
          fieldName: 'field2',
          pinnedFields: { field1: true, field2: true, field3: true },
          expectedPosition: 2,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: false }),
          ],
          fieldName: 'field2',
          pinnedFields: { field1: true, field2: true },
          expectedPosition: 1,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: false }),
            documentFieldMock({ key: 'field4', isPinned: true }),
          ],
          fieldName: 'field2',
          pinnedFields: { field1: true, field2: true, field4: true },
          expectedPosition: 2,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
          ],
          fieldName: 'field2',
          pinnedFields: { field1: true, field2: true },
          expectedPosition: 1,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: false }),
            documentFieldMock({ key: 'field3', isPinned: true }),
          ],
          fieldName: 'field3',
          pinnedFields: { field1: true, field3: true },
          expectedPosition: 2,
        },
      ])(
        'should return $expectedPosition ($fieldList)',
        ({ fieldList, fieldName, pinnedFields, expectedPosition }) => {
          const result = getPositionAfterToggling(
            fieldName,
            pinnedFields as unknown as Record<string, boolean>,
            fieldList
          );
          expect(result).toBe(expectedPosition);
        }
      );
    });
  });

  describe('when the field goes from unpinned to pinned', () => {
    describe('when there are no other pinned fields', () => {
      const fieldList = [
        documentFieldMock({ key: 'field1', isPinned: false }),
        documentFieldMock({ key: 'field2', isPinned: false }),
        documentFieldMock({ key: 'field3', isPinned: false }),
      ];

      it('should return 0', () => {
        const result = getPositionAfterToggling('field1', {}, fieldList);
        expect(result).toBe(0);
      });
    });

    describe('when there are other pinned fields', () => {
      it.each([
        {
          fieldList: [documentFieldMock({ key: 'field1', isPinned: false })],
          fieldName: 'field1',
          pinnedFields: {},
          expectedPosition: 0,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: false }),
            documentFieldMock({ key: 'field2', isPinned: true }),
          ],
          fieldName: 'field1',
          pinnedFields: { field2: true },
          expectedPosition: 0,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: false }),
          ],
          fieldName: 'field2',
          pinnedFields: { field1: true },
          expectedPosition: 1,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: false }),
          ],
          fieldName: 'field3',
          pinnedFields: { field1: true, field2: true },
          expectedPosition: 2,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: false }),
            documentFieldMock({ key: 'field4', isPinned: true }),
          ],
          fieldName: 'field3',
          pinnedFields: { field1: true, field2: true },
          expectedPosition: 2,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: false }),
            documentFieldMock({ key: 'field2', isPinned: false }),
          ],
          fieldName: 'field2',
          pinnedFields: {},
          expectedPosition: 0,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: false }),
          ],
          fieldName: 'field2',
          pinnedFields: { field1: true },
          expectedPosition: 1,
        },
        {
          fieldList: [
            documentFieldMock({ key: 'field1', isPinned: true }),
            documentFieldMock({ key: 'field2', isPinned: true }),
            documentFieldMock({ key: 'field3', isPinned: false }),
          ],
          fieldName: 'field3',
          pinnedFields: { field1: true, field2: true },
          expectedPosition: 2,
        },
      ])(
        'should return $expectedPosition',
        ({ fieldList, fieldName, pinnedFields, expectedPosition }) => {
          const result = getPositionAfterToggling(
            fieldName,
            pinnedFields as Record<string, boolean>,
            fieldList
          );
          expect(result).toBe(expectedPosition);
        }
      );
    });
  });
});
