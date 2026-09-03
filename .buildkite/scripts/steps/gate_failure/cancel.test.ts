/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockGetMetadataKeys = jest.fn();
const mockGetMetadata = jest.fn();
const mockCancelStep = jest.fn();
const mockSetAnnotation = jest.fn();

jest.mock('#pipeline-utils', () => ({
  BuildkiteClient: jest.fn().mockImplementation(() => ({
    getMetadataKeys: mockGetMetadataKeys,
    getMetadata: mockGetMetadata,
    cancelStep: mockCancelStep,
    setAnnotation: mockSetAnnotation,
  })),
}));

const ORIGINAL_ENV = process.env;

const runCancelModule = () => {
  jest.isolateModules(() => {
    require('./cancel');
  });
};

beforeEach(() => {
  jest.resetAllMocks();
  jest.resetModules();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env = {
    ...ORIGINAL_ENV,
    BUILDKITE_STEP_KEY: 'check_oas_snapshot',
    BUILDKITE_LABEL: 'Check OAS Snapshot',
  };
  mockGetMetadataKeys.mockReturnValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('cancel-on-gate-failure', () => {
  describe('when no cancel keys are registered', () => {
    it('does nothing', () => {
      mockGetMetadataKeys.mockReturnValue([]);
      runCancelModule();
      expect(mockCancelStep).not.toHaveBeenCalled();
      expect(mockSetAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('self-cancellation prevention', () => {
    it('does not cancel the running gate step even when it is in the batch', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(
        JSON.stringify(['check_oas_snapshot', 'scout_test_lane_1', 'jest'])
      );

      runCancelModule();

      expect(mockCancelStep).not.toHaveBeenCalledWith('check_oas_snapshot');
      expect(mockCancelStep).toHaveBeenCalledWith('scout_test_lane_1');
      expect(mockCancelStep).toHaveBeenCalledWith('jest');
    });

    it('includes a was-not-canceled note in both annotations when self is in the batch', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['check_oas_snapshot', 'jest']));

      runCancelModule();

      expect(mockSetAnnotation).toHaveBeenNthCalledWith(
        1,
        'cancel-on-gate-failure:check_oas_snapshot',
        'info',
        expect.stringContaining('was not canceled')
      );
      expect(mockSetAnnotation).toHaveBeenNthCalledWith(
        2,
        'cancel-on-gate-failure:check_oas_snapshot',
        'info',
        expect.stringContaining('was not canceled')
      );
    });

    it('writes the initial annotation before calling cancelStep', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['check_oas_snapshot', 'jest']));

      const callOrder: string[] = [];
      mockSetAnnotation.mockImplementation(() => callOrder.push('annotate'));
      mockCancelStep.mockImplementation(() => callOrder.push('cancel'));

      runCancelModule();

      expect(callOrder).toEqual(['annotate', 'cancel', 'annotate']);
    });

    it('returns early without annotation when the gate step is the only registered key', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['check_oas_snapshot']));

      runCancelModule();

      expect(mockCancelStep).not.toHaveBeenCalled();
      expect(mockSetAnnotation).not.toHaveBeenCalled();
    });

    it('does not filter any key when BUILDKITE_STEP_KEY is unset', () => {
      delete process.env.BUILDKITE_STEP_KEY;
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest', 'ftr_configs_1']));

      runCancelModule();

      expect(mockCancelStep).toHaveBeenCalledWith('jest');
      expect(mockCancelStep).toHaveBeenCalledWith('ftr_configs_1');
    });
  });

  describe('annotation behavior', () => {
    it('writes an initial annotation before the cancel loop then overwrites with the final summary', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest']));

      const callOrder: string[] = [];
      mockSetAnnotation.mockImplementation(() => callOrder.push('annotate'));
      mockCancelStep.mockImplementation(() => callOrder.push('cancel'));

      runCancelModule();

      expect(callOrder).toEqual(['annotate', 'cancel', 'annotate']);
    });

    it('uses the gate step key in the annotation context', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest']));

      runCancelModule();

      expect(mockSetAnnotation).toHaveBeenCalledWith(
        'cancel-on-gate-failure:check_oas_snapshot',
        expect.any(String),
        expect.any(String)
      );
    });

    it('uses warning style when some cancels fail', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest']));
      mockCancelStep.mockImplementation(() => {
        throw new Error('some unexpected failure');
      });

      runCancelModule();

      expect(process.exit).toHaveBeenCalledWith(1);
      const finalCall = mockSetAnnotation.mock.calls[mockSetAnnotation.mock.calls.length - 1];
      expect(finalCall[1]).toBe('warning');
    });

    it('uses info style when all cancels succeed', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest']));

      runCancelModule();

      expect(process.exit).not.toHaveBeenCalled();
      const finalCall = mockSetAnnotation.mock.calls[mockSetAnnotation.mock.calls.length - 1];
      expect(finalCall[1]).toBe('info');
    });

    it('collapses canceled step keys in the final annotation', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest', 'ftr_configs_1']));

      runCancelModule();

      const finalCall = mockSetAnnotation.mock.calls[mockSetAnnotation.mock.calls.length - 1];
      expect(finalCall[2]).toContain('Canceled 2 step(s).');
      expect(finalCall[2]).toContain('<details><summary>Canceled step keys</summary>');
      expect(finalCall[2]).toContain('- jest\n- ftr_configs_1');
    });

    it('separates collapsed step lists from visible cancellation failures', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest', 'ftr_configs_1', 'scout']));
      mockCancelStep.mockImplementation((key) => {
        if (key === 'ftr_configs_1') throw new Error('already finished');
        if (key === 'scout') throw new Error('network error');
      });

      runCancelModule();

      const finalCall = mockSetAnnotation.mock.calls[mockSetAnnotation.mock.calls.length - 1];
      expect(finalCall[2]).toContain('</details>\n\nAlready finished: 1 step(s).');
      expect(finalCall[2]).toContain('</details>\n\nFailed to cancel:');
      expect(finalCall[2]).toContain('- scout: network error');
    });
  });

  describe('already-finished step handling', () => {
    it('skips steps that are already finished without exiting', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest', 'ftr_configs_1']));
      mockCancelStep.mockImplementation((key) => {
        if (key === 'jest') throw new Error('already finished');
      });

      runCancelModule();

      expect(process.exit).not.toHaveBeenCalled();
      const finalCall = mockSetAnnotation.mock.calls[mockSetAnnotation.mock.calls.length - 1];
      expect(finalCall[2]).toContain('Already finished: 1 step(s).');
      expect(finalCall[2]).toContain('<details><summary>Already-finished step keys</summary>');
      expect(finalCall[2]).toContain('- jest');
    });

    it('exits with 1 when a non-already-finished cancel fails', () => {
      mockGetMetadataKeys.mockReturnValue(['cancel_on_gate_failure_batch:pipeline']);
      mockGetMetadata.mockReturnValue(JSON.stringify(['jest']));
      mockCancelStep.mockImplementation(() => {
        throw new Error('network error');
      });

      runCancelModule();

      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('multiple batch keys', () => {
    it('collects step keys from all cancel_on_gate_failure_batch:* metadata keys', () => {
      mockGetMetadataKeys.mockReturnValue([
        'cancel_on_gate_failure_batch:pipeline',
        'cancel_on_gate_failure_batch:scout',
      ]);
      mockGetMetadata.mockImplementation((key: string) => {
        if (key === 'cancel_on_gate_failure_batch:pipeline') return JSON.stringify(['jest']);
        if (key === 'cancel_on_gate_failure_batch:scout') return JSON.stringify(['scout_lane_1']);
        return null;
      });

      runCancelModule();

      expect(mockCancelStep).toHaveBeenCalledWith('jest');
      expect(mockCancelStep).toHaveBeenCalledWith('scout_lane_1');
    });

    it('deduplicates step keys that appear in multiple batches', () => {
      mockGetMetadataKeys.mockReturnValue([
        'cancel_on_gate_failure_batch:pipeline',
        'cancel_on_gate_failure_batch:scout',
      ]);
      mockGetMetadata.mockImplementation((key: string) => {
        if (key === 'cancel_on_gate_failure_batch:pipeline')
          return JSON.stringify(['jest', 'shared_step']);
        if (key === 'cancel_on_gate_failure_batch:scout')
          return JSON.stringify(['scout_lane_1', 'shared_step']);
        return null;
      });

      runCancelModule();

      const cancelCalls = mockCancelStep.mock.calls.map(([k]: [string]) => k);
      expect(cancelCalls.filter((k) => k === 'shared_step')).toHaveLength(1);
    });

    it('falls back to [] when a metadata value is malformed JSON', () => {
      mockGetMetadataKeys.mockReturnValue([
        'cancel_on_gate_failure_batch:pipeline',
        'cancel_on_gate_failure_batch:bad',
      ]);
      mockGetMetadata.mockImplementation((key: string) => {
        if (key === 'cancel_on_gate_failure_batch:pipeline') return JSON.stringify(['jest']);
        if (key === 'cancel_on_gate_failure_batch:bad') return 'not-valid-json';
        return null;
      });

      runCancelModule();

      expect(mockCancelStep).toHaveBeenCalledWith('jest');
      expect(mockCancelStep).toHaveBeenCalledTimes(1);
    });
  });
});
