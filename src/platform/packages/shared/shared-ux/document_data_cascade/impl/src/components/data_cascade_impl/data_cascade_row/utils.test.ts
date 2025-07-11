/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { faker } from '@faker-js/faker';
import { type Row } from '@tanstack/react-table';
import { type GroupNode } from '../../data_cascade_provider';
import { getCascadeRowNodePath, getCascadeRowNodePathValueRecord } from './utils';

describe('cascade row utils', () => {
  const currentGroupByColumns = ['customer_full_name', 'customer_birth_date'];

  const mockedRowInstance = {
    depth: 2,
    parentId: 'parent_id',
    original: {
      customer_full_name: faker.person.fullName(),
      customer_birth_date: faker.date.past().toISOString(),
    },
    getParentRows: jest.fn(),
  };

  // TODO: implement mock for getParentRows
  jest.spyOn(mockedRowInstance, 'getParentRows').mockImplementation(() => {});

  describe('getCascadeRowNodePath', () => {
    it('should return the path of the row node in the group by hierarchy', () => {
      const result = getCascadeRowNodePath(
        currentGroupByColumns,
        mockedRowInstance as unknown as Row<GroupNode>
      );
      expect(result).toEqual(['customer_full_name', 'customer_birth_date']);
    });
  });

  describe('getCascadeRowNodePathValueRecord', () => {
    it('should return a record of the path values for the provided row node', () => {
      const result = getCascadeRowNodePathValueRecord(
        currentGroupByColumns,
        mockedRowInstance as unknown as Row<GroupNode>
      );
      expect(result).toEqual({
        customer_full_name: 'John Doe',
        customer_birth_date: '1990-01-01',
      });
    });
  });
});
