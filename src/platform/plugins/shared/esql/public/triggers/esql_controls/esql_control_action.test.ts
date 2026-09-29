/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { ControlTriggerSource, ESQLVariableType } from '@kbn/esql-types';
import { dismissAllFlyoutsExceptFor, DiscoverFlyouts } from '@kbn/discover-utils';
import { openLazyFlyout } from '@kbn/presentation-util';
import { BehaviorSubject } from 'rxjs';
import { CreateESQLControlAction } from './esql_control_action';

// Mock external dependencies
vi.mock('@kbn/discover-utils');
vi.mock('@kbn/presentation-util');
vi.mock('./esql_control_helpers', () => {
  const mocked = {
    loadESQLControlFlyout: vi.fn().mockResolvedValue({}),
  };
  return { ...mocked, default: mocked };
});

const mockDismissAllFlyoutsExceptFor = dismissAllFlyoutsExceptFor as MockedFunction<
  typeof dismissAllFlyoutsExceptFor
>;
const mockOpenLazyFlyout = openLazyFlyout as MockedFunction<typeof openLazyFlyout>;

describe('CreateESQLControlAction', () => {
  const dataMock = dataPluginMock.createStartContract();
  const timefilterMock = dataMock.query.timefilter.timefilter;
  let action: CreateESQLControlAction;
  let mockCore: ReturnType<typeof coreMock.createStart>;
  let currentAppId$: BehaviorSubject<string>;
  const searchMock = dataMock.search.search;

  const mockContext = {
    queryString: 'FROM index | WHERE field = ?variable',
    variableType: ESQLVariableType.VALUES,
    esqlVariables: [],
    onSaveControl: vi.fn(),
    onCancelControl: vi.fn(),
    parentApi: {},
    triggerSource: ControlTriggerSource.QUESTION_MARK,
    returnFocus: vi.fn(),
  };

  beforeEach(() => {
    mockCore = coreMock.createStart();
    mockCore.uiSettings.get.mockReturnValue(true); // Enable ESQL
    currentAppId$ = new BehaviorSubject('discover');
    mockCore.application.currentAppId$ = currentAppId$;

    action = new CreateESQLControlAction(mockCore, searchMock, timefilterMock);

    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should dismiss all flyouts except esqlControls before opening control flyout when in Discover app', async () => {
      currentAppId$.next('discover');

      await action.execute(mockContext);

      expect(mockDismissAllFlyoutsExceptFor).toHaveBeenCalledWith(DiscoverFlyouts.esqlControls);
      expect(mockDismissAllFlyoutsExceptFor).toHaveBeenCalledTimes(1);
      expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);
    });

    it('should not dismiss flyouts when not in Discover app', async () => {
      currentAppId$.next('dashboard');

      await action.execute(mockContext);

      expect(mockDismissAllFlyoutsExceptFor).not.toHaveBeenCalled();
      expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);
    });

    it('should continue opening flyout even if dismissAllFlyoutsExceptFor throws an error in Discover', async () => {
      currentAppId$.next('discover');
      mockDismissAllFlyoutsExceptFor.mockImplementation(() => {
        throw new Error('Failed to dismiss flyouts');
      });

      await action.execute(mockContext);

      expect(mockDismissAllFlyoutsExceptFor).toHaveBeenCalledWith(DiscoverFlyouts.esqlControls);
      expect(mockOpenLazyFlyout).toHaveBeenCalledTimes(1);
    });

    it('should open lazy flyout with correct configuration after conditionally dismissing flyouts', async () => {
      await action.execute(mockContext);

      expect(mockOpenLazyFlyout).toHaveBeenCalledWith({
        core: mockCore,
        parentApi: {},
        returnFocus: mockContext.returnFocus,
        loadContent: expect.any(Function),
        flyoutProps: {
          'data-test-subj': 'create_esql_control_flyout',
          isResizable: true,
          maxWidth: 800,
          onClose: expect.any(Function),
        },
      });
    });

    it('should open lazy flyout with correct configuration when no cancel is provided', async () => {
      await action.execute({ ...mockContext, onCancelControl: undefined });
      expect(mockOpenLazyFlyout).toHaveBeenCalledWith(
        expect.objectContaining({
          flyoutProps: expect.not.objectContaining({ onClose: expect.any(Function) }),
        })
      );
    });
  });

  describe('isCompatible', () => {
    it('should return true when ESQL is enabled and variable type is valid', async () => {
      mockCore.uiSettings.get.mockReturnValue(true);

      const result = await action.isCompatible({
        ...mockContext,
        variableType: ESQLVariableType.VALUES,
      });

      expect(result).toBe(true);
    });

    it('should return false when ESQL is disabled', async () => {
      mockCore.uiSettings.get.mockReturnValue(false);

      const result = await action.isCompatible(mockContext);

      expect(result).toBe(false);
    });
  });
});
