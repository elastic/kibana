/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ProjectRoutingAccess } from '@kbn/cps-utils';
import type { ICPSManager } from '@kbn/cps-utils';
import { getProjectRouting } from './project_routing';

describe('getProjectRouting', () => {
  describe('CPS unavailable (cpsManager not provided)', () => {
    it('skips project routing entirely and returns undefined', () => {
      const result = getProjectRouting('_alias:_origin');
      expect(result).toBeUndefined();
    });
  });

  describe('CPS disabled (project picker access is DISABLED)', () => {
    it('skips project routing entirely and returns undefined', () => {
      const mockCpsManager = {
        getProjectPickerAccess: jest.fn(() => ProjectRoutingAccess.DISABLED),
        getProjectRouting: jest.fn(() => '_alias:_origin'),
      } as unknown as ICPSManager;

      const result = getProjectRouting('_alias:_origin', mockCpsManager);

      expect(result).toBeUndefined();
      expect(mockCpsManager.getProjectPickerAccess).toHaveBeenCalled();
    });
  });

  describe('Project routing with CPS enabled', () => {
    it.each([
      // Consumer passes explicit value
      {
        description: 'Consumer passes _alias:* with global _alias:_origin',
        explicitValue: '_alias:*' as const,
        globalValue: '_alias:_origin' as const,
        expectedResult: undefined,
        shouldCallGetProjectRouting: false,
      },
      {
        description: 'Consumer passes _alias:* with global _alias:*',
        explicitValue: '_alias:*' as const,
        globalValue: '_alias:*' as const,
        expectedResult: undefined,
        shouldCallGetProjectRouting: false,
      },
      {
        description: 'Consumer passes _alias:_origin with global _alias:_origin',
        explicitValue: '_alias:_origin' as const,
        globalValue: '_alias:_origin' as const,
        expectedResult: '_alias:_origin',
        shouldCallGetProjectRouting: false,
      },
      {
        description: 'Consumer passes _alias:_origin with global _alias:*',
        explicitValue: '_alias:_origin' as const,
        globalValue: '_alias:*' as const,
        expectedResult: '_alias:_origin',
        shouldCallGetProjectRouting: false,
      },
      // Consumer passes nothing (uses global value)
      {
        description: 'Consumer passes nothing, global value is _alias:_origin',
        explicitValue: undefined,
        globalValue: '_alias:_origin' as const,
        expectedResult: '_alias:_origin',
        shouldCallGetProjectRouting: true,
      },
      {
        description: 'Consumer passes nothing, global value is _alias:*',
        explicitValue: undefined,
        globalValue: '_alias:*' as const,
        expectedResult: undefined,
        shouldCallGetProjectRouting: true,
      },
      {
        description: 'Consumer passes nothing, global value is undefined',
        explicitValue: undefined,
        globalValue: undefined,
        expectedResult: undefined,
        shouldCallGetProjectRouting: true,
      },
    ])(
      '$description -> returns $expectedResult',
      ({ explicitValue, globalValue, expectedResult, shouldCallGetProjectRouting }) => {
        const mockCpsManager = {
          getProjectPickerAccess: jest.fn(() => ProjectRoutingAccess.EDITABLE),
          getProjectRouting: jest.fn(() => globalValue),
        } as unknown as ICPSManager;

        const result = getProjectRouting(explicitValue, mockCpsManager);

        expect(result).toEqual(expectedResult);
        expect(mockCpsManager.getProjectPickerAccess).toHaveBeenCalled();
        if (shouldCallGetProjectRouting) {
          expect(mockCpsManager.getProjectRouting).toHaveBeenCalled();
        } else {
          expect(mockCpsManager.getProjectRouting).not.toHaveBeenCalled();
        }
      }
    );
  });

  describe('Different access levels', () => {
    it('works with READONLY access level', () => {
      const mockCpsManager = {
        getProjectPickerAccess: jest.fn(() => ProjectRoutingAccess.READONLY),
        getProjectRouting: jest.fn(() => '_alias:_origin'),
      } as unknown as ICPSManager;

      const result = getProjectRouting('_alias:_origin', mockCpsManager);

      expect(result).toEqual('_alias:_origin');
      expect(mockCpsManager.getProjectPickerAccess).toHaveBeenCalled();
    });
  });
});
