/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowsBaseTelemetry } from './telemetry';
import { WorkflowImportExportEventTypes } from '../lib/telemetry/events/workflows/import_export/types';

describe('WorkflowsBaseTelemetry – import/export events', () => {
  let reportEvent: jest.Mock;
  let telemetry: WorkflowsBaseTelemetry;

  beforeEach(() => {
    reportEvent = jest.fn();
    telemetry = new WorkflowsBaseTelemetry({ reportEvent });
  });

  describe('reportWorkflowExported', () => {
    it('should report a successful single yaml export with no references', () => {
      telemetry.reportWorkflowExported({
        workflowCount: 1,
        format: 'yaml',
        referenceResolution: 'none',
      });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowExported,
        expect.objectContaining({
          eventName: 'Workflow exported',
          workflowCount: 1,
          format: 'yaml',
          referenceResolution: 'none',
          result: 'success',
        })
      );
      expect(reportEvent.mock.calls[0][1].errorMessage).toBeUndefined();
    });

    it('should report a successful zip export with add_all reference resolution', () => {
      telemetry.reportWorkflowExported({
        workflowCount: 5,
        format: 'zip',
        referenceResolution: 'add_all',
      });

      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowExported,
        expect.objectContaining({
          workflowCount: 5,
          format: 'zip',
          referenceResolution: 'add_all',
          result: 'success',
        })
      );
    });

    it('should report a failed export with error message', () => {
      telemetry.reportWorkflowExported({
        workflowCount: 3,
        format: 'zip',
        referenceResolution: 'ignore',
        error: new Error('Network timeout'),
      });

      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowExported,
        expect.objectContaining({
          workflowCount: 3,
          format: 'zip',
          referenceResolution: 'ignore',
          result: 'failed',
          errorMessage: 'Network timeout',
        })
      );
    });

    it('should report add_direct reference resolution', () => {
      telemetry.reportWorkflowExported({
        workflowCount: 2,
        format: 'zip',
        referenceResolution: 'add_direct',
      });

      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowExported,
        expect.objectContaining({
          referenceResolution: 'add_direct',
        })
      );
    });
  });

  describe('reportWorkflowImported', () => {
    const baseParams = {
      workflowCount: 3,
      format: 'zip' as const,
      conflictResolution: 'generateNewIds' as const,
      hasConflicts: false,
      successCount: 3,
      failedCount: 0,
      minStepCount: 1,
      maxStepCount: 10,
      minTriggerCount: 0,
      maxTriggerCount: 2,
    };

    it('should report a successful import with all metadata', () => {
      telemetry.reportWorkflowImported(baseParams);

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          eventName: 'Workflow imported',
          workflowCount: 3,
          format: 'zip',
          conflictResolution: 'generateNewIds',
          hasConflicts: false,
          successCount: 3,
          failedCount: 0,
          minStepCount: 1,
          maxStepCount: 10,
          minTriggerCount: 0,
          maxTriggerCount: 2,
          result: 'success',
        })
      );
      expect(reportEvent.mock.calls[0][1].errorMessage).toBeUndefined();
    });

    it('should report a failed import with error message', () => {
      telemetry.reportWorkflowImported({
        ...baseParams,
        successCount: 0,
        failedCount: 3,
        error: new Error('Server error'),
      });

      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          result: 'failed',
          errorMessage: 'Server error',
          successCount: 0,
          failedCount: 3,
        })
      );
    });

    it('should report import with conflicts and overwrite resolution', () => {
      telemetry.reportWorkflowImported({
        ...baseParams,
        hasConflicts: true,
        conflictResolution: 'overwrite',
      });

      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          hasConflicts: true,
          conflictResolution: 'overwrite',
        })
      );
    });

    it('should report single yaml import', () => {
      telemetry.reportWorkflowImported({
        ...baseParams,
        workflowCount: 1,
        format: 'yaml',
        successCount: 1,
        failedCount: 0,
        minStepCount: 5,
        maxStepCount: 5,
        minTriggerCount: 1,
        maxTriggerCount: 1,
      });

      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          workflowCount: 1,
          format: 'yaml',
          minStepCount: 5,
          maxStepCount: 5,
          minTriggerCount: 1,
          maxTriggerCount: 1,
        })
      );
    });

    it('should report partial import failure', () => {
      telemetry.reportWorkflowImported({
        ...baseParams,
        successCount: 2,
        failedCount: 1,
      });

      expect(reportEvent).toHaveBeenCalledWith(
        WorkflowImportExportEventTypes.WorkflowImported,
        expect.objectContaining({
          result: 'success',
          successCount: 2,
          failedCount: 1,
        })
      );
    });
  });
});
