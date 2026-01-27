/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows/common/constants';
import { useCapabilities } from './use_capabilities';
import { useKibana } from './use_kibana';
import { createStartServicesMock } from '../mocks';

jest.mock('./use_kibana');
const mockUseKibana = useKibana as jest.Mock;

describe('useCapabilities', () => {
  let mockServices: ReturnType<typeof createStartServicesMock>;

  const mockCapabilities = (capabilities: any) => {
    mockServices.application.capabilities = {
      [WORKFLOWS_MANAGEMENT_FEATURE_ID]: capabilities,
      navLinks: {},
      management: {},
      catalogue: {},
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockServices = createStartServicesMock();
    mockUseKibana.mockReturnValue({ services: mockServices });
  });

  describe('when all capabilities are enabled', () => {
    beforeEach(() => {
      mockCapabilities({
        createWorkflow: true,
        readWorkflow: true,
        updateWorkflow: true,
        deleteWorkflow: true,
        executeWorkflow: true,
        readWorkflowExecution: true,
        cancelWorkflowExecution: true,
      });
    });

    it('should return all capabilities as true', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: true,
        canReadWorkflow: true,
        canUpdateWorkflow: true,
        canDeleteWorkflow: true,
        canExecuteWorkflow: true,
        canReadWorkflowExecution: true,
        canCancelWorkflowExecution: true,
      });
    });
  });

  describe('when all capabilities are disabled', () => {
    beforeEach(() => {
      mockCapabilities({
        createWorkflow: false,
        readWorkflow: false,
        updateWorkflow: false,
        deleteWorkflow: false,
        executeWorkflow: false,
        readWorkflowExecution: false,
        cancelWorkflowExecution: false,
      });
    });

    it('should return all capabilities as false', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: false,
        canReadWorkflow: false,
        canUpdateWorkflow: false,
        canDeleteWorkflow: false,
        canExecuteWorkflow: false,
        canReadWorkflowExecution: false,
        canCancelWorkflowExecution: false,
      });
    });
  });

  describe('when some capabilities are enabled', () => {
    beforeEach(() => {
      mockCapabilities({
        createWorkflow: true,
        readWorkflow: true,
        updateWorkflow: false,
        deleteWorkflow: false,
        executeWorkflow: true,
        readWorkflowExecution: false,
        cancelWorkflowExecution: false,
      });
    });

    it('should return correct mixed capabilities', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: true,
        canReadWorkflow: true,
        canUpdateWorkflow: false,
        canDeleteWorkflow: false,
        canExecuteWorkflow: true,
        canReadWorkflowExecution: false,
        canCancelWorkflowExecution: false,
      });
    });
  });

  describe('when capabilities object is undefined', () => {
    beforeEach(() => {
      mockCapabilities(undefined);
    });

    it('should return all capabilities as false', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: false,
        canReadWorkflow: false,
        canUpdateWorkflow: false,
        canDeleteWorkflow: false,
        canExecuteWorkflow: false,
        canReadWorkflowExecution: false,
        canCancelWorkflowExecution: false,
      });
    });
  });

  describe('when capabilities object does not exist', () => {
    beforeEach(() => {
      mockCapabilities({});
    });

    it('should return all capabilities as false', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: false,
        canReadWorkflow: false,
        canUpdateWorkflow: false,
        canDeleteWorkflow: false,
        canExecuteWorkflow: false,
        canReadWorkflowExecution: false,
        canCancelWorkflowExecution: false,
      });
    });
  });

  describe('when application is undefined', () => {
    beforeEach(() => {
      mockServices.application = undefined as any;
    });

    it('should return all capabilities as false', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: false,
        canReadWorkflow: false,
        canUpdateWorkflow: false,
        canDeleteWorkflow: false,
        canExecuteWorkflow: false,
        canReadWorkflowExecution: false,
        canCancelWorkflowExecution: false,
      });
    });
  });

  describe('when capability values are falsy', () => {
    beforeEach(() => {
      mockCapabilities({
        createWorkflow: 0,
        readWorkflow: '',
        updateWorkflow: null,
        deleteWorkflow: undefined,
        executeWorkflow: false,
        readWorkflowExecution: 0,
        cancelWorkflowExecution: null,
      });
    });

    it('should convert all falsy values to false', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: false,
        canReadWorkflow: false,
        canUpdateWorkflow: false,
        canDeleteWorkflow: false,
        canExecuteWorkflow: false,
        canReadWorkflowExecution: false,
        canCancelWorkflowExecution: false,
      });
    });
  });

  describe('when capability values are truthy', () => {
    beforeEach(() => {
      mockCapabilities({
        createWorkflow: 1,
        readWorkflow: 'true',
        updateWorkflow: {},
        deleteWorkflow: [],
        executeWorkflow: true,
        readWorkflowExecution: 'test',
        cancelWorkflowExecution: 42,
      });
    });

    it('should convert all truthy values to true', () => {
      const { result } = renderHook(useCapabilities);

      expect(result.current).toEqual({
        canCreateWorkflow: true,
        canReadWorkflow: true,
        canUpdateWorkflow: true,
        canDeleteWorkflow: true,
        canExecuteWorkflow: true,
        canReadWorkflowExecution: true,
        canCancelWorkflowExecution: true,
      });
    });
  });
});
