/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { makeActionContext } from '../mocks/helpers';
import { createCellActionFactory } from './factory';

const mockContext = makeActionContext();

const mockActionIsCompatible = jest.fn(async () => true);
const mockActionExecute = jest.fn(async () => {});

const testAction = {
  id: 'genericTestId',
  type: 'genericCellActionType',
  getIconType: () => 'test-icon',
  getDisplayName: () => 'test name',
  isCompatible: mockActionIsCompatible,
  execute: mockActionExecute,
};
const createTestAction = (type: string) => ({
  ...testAction,
  type,
});

describe('createCellActionFactory', () => {
  const id = 'testId';
  const type = 'testActionType';

  const createActionFactory = createCellActionFactory(createTestAction);
  const actionFactory = createActionFactory(type);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create action factory executes the action creation', () => {
    expect(actionFactory({ id: 'test' }).type).toBe(type);
  });

  it('should create action with id only', () => {
    const action = actionFactory({ id });
    expect(action.id).toEqual(id);
    expect(action.order).toBeUndefined();
    expect(action.getIconType).toBe(testAction.getIconType);
    expect(action.getDisplayName).toBe(testAction.getDisplayName);
    expect(action.isCompatible).toBe(testAction.isCompatible);
    expect(action.execute).toBe(testAction.execute);
  });

  it('should create action with order', () => {
    const order = 1234;
    const action = actionFactory({ id, order });
    expect(action.order).toEqual(order);
  });

  it('should create action with custom execute and isCompatible', async () => {
    const customExecute = jest.fn();
    const customIsCompatible = jest.fn();
    const action = actionFactory({
      id,
      execute: customExecute,
      isCompatible: customIsCompatible,
    });

    await action.isCompatible(mockContext);
    expect(customIsCompatible).toHaveBeenCalledWith(mockContext);
    expect(mockActionIsCompatible).not.toHaveBeenCalled();

    await action.execute(mockContext);
    expect(customExecute).toHaveBeenCalledWith(mockContext);
    expect(mockActionExecute).not.toHaveBeenCalled();
  });

  it('should create action with custom execute', async () => {
    const customExecute = jest.fn();
    const action = actionFactory({ id, execute: customExecute });

    await action.isCompatible(mockContext);
    expect(mockActionIsCompatible).toHaveBeenCalledWith(mockContext);

    await action.execute(mockContext);
    expect(customExecute).toHaveBeenCalledWith(mockContext);
    expect(mockActionExecute).not.toHaveBeenCalled();
  });

  it('should create action with custom isCompatible', async () => {
    const customIsCompatible = jest.fn(async () => true);
    const action = actionFactory({ id, isCompatible: customIsCompatible });

    await action.isCompatible(mockContext);
    expect(mockActionIsCompatible).toHaveBeenCalledWith(mockContext);
    expect(customIsCompatible).toHaveBeenCalledWith(mockContext);

    await action.execute(mockContext);
    expect(mockActionExecute).toHaveBeenCalledWith(mockContext);
  });

  describe('combine', () => {
    it('should combine factory with new icon', () => {
      const newType = 'action-type-2';
      const combinedFactory = actionFactory.combine({
        type: newType,
      });
      const action = combinedFactory({ id });
      expect(action.type).toEqual(newType);
    });

    it('should combine factory with isCompatible function', async () => {
      const combinedIsCompatible = jest.fn(async () => true);
      const customIsCompatible = jest.fn(async () => true);
      const combinedFactory = actionFactory.combine({ isCompatible: combinedIsCompatible });
      const action = combinedFactory({ id, isCompatible: customIsCompatible });

      await action.isCompatible(mockContext);
      expect(mockActionIsCompatible).toHaveBeenCalledWith(mockContext);
      expect(combinedIsCompatible).toHaveBeenCalledWith(mockContext);
      expect(customIsCompatible).toHaveBeenCalledWith(mockContext);

      await action.execute(mockContext);
      expect(mockActionExecute).toHaveBeenCalledWith(mockContext);
    });

    it('should combine factory with custom execute and isCompatible', async () => {
      const combinedExecute = jest.fn();
      const combinedIsCompatible = jest.fn();
      const combinedFactory = actionFactory.combine({
        execute: combinedExecute,
        isCompatible: combinedIsCompatible,
      });
      const action = combinedFactory({ id });

      await action.isCompatible(mockContext);
      expect(combinedIsCompatible).toHaveBeenCalledWith(mockContext);
      expect(mockActionIsCompatible).not.toHaveBeenCalled();

      await action.execute(mockContext);
      expect(combinedExecute).toHaveBeenCalledWith(mockContext);
      expect(mockActionExecute).not.toHaveBeenCalled();
    });
  });
});
