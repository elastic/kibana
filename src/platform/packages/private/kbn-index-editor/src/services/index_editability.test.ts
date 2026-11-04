/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexEditorResolution } from '@kbn/esql-types';
import {
  assessIndexEditability,
  getIndexEditabilityErrorTitle,
  type IndexEditabilityReason,
} from './index_editability';

const resolution = (overrides: Partial<IndexEditorResolution> = {}): IndexEditorResolution => ({
  kind: 'index',
  closed: false,
  frozen: false,
  routingRequired: false,
  sourceDisabled: false,
  sourceSynthetic: false,
  runtimeFields: [],
  ...overrides,
});

describe('assessIndexEditability', () => {
  describe('editing a standard index', () => {
    const opts = { indexMode: 'standard' } as const;

    it('allows a plain standard index (no explicit mode)', () => {
      expect(assessIndexEditability(resolution({ mode: undefined }), opts)).toEqual({
        editable: true,
      });
    });

    it('allows an index whose mode is explicitly standard', () => {
      expect(assessIndexEditability(resolution({ mode: 'standard' }), opts)).toEqual({
        editable: true,
      });
    });

    it('rejects a lookup-mode index', () => {
      expect(assessIndexEditability(resolution({ mode: 'lookup' }), opts)).toEqual({
        editable: false,
        reason: 'unsupportedMode',
      });
    });

    it('rejects a logsdb index', () => {
      expect(assessIndexEditability(resolution({ mode: 'logsdb' }), opts)).toEqual({
        editable: false,
        reason: 'unsupportedMode',
      });
    });

    it('rejects a time_series index', () => {
      expect(assessIndexEditability(resolution({ mode: 'time_series' }), opts)).toEqual({
        editable: false,
        reason: 'unsupportedMode',
      });
    });

    it('rejects a closed index', () => {
      expect(assessIndexEditability(resolution({ closed: true }), opts)).toEqual({
        editable: false,
        reason: 'closed',
      });
    });

    it('rejects a frozen index', () => {
      expect(assessIndexEditability(resolution({ frozen: true }), opts)).toEqual({
        editable: false,
        reason: 'frozen',
      });
    });

    it('rejects a routing-required index', () => {
      expect(assessIndexEditability(resolution({ routingRequired: true }), opts)).toEqual({
        editable: false,
        reason: 'routingRequired',
      });
    });

    it('rejects an index with _source disabled', () => {
      expect(assessIndexEditability(resolution({ sourceDisabled: true }), opts)).toEqual({
        editable: false,
        reason: 'sourceDisabled',
      });
    });

    it('rejects an index with synthetic _source', () => {
      expect(assessIndexEditability(resolution({ sourceSynthetic: true }), opts)).toEqual({
        editable: false,
        reason: 'sourceSynthetic',
      });
    });

    it('rejects an unsupported mode before checking _source', () => {
      expect(
        assessIndexEditability(resolution({ mode: 'logsdb', sourceSynthetic: true }), opts)
      ).toEqual({
        editable: false,
        reason: 'unsupportedMode',
      });
    });

    it('rejects a name that no longer resolves to an index', () => {
      expect(assessIndexEditability(resolution({ kind: 'none' }), opts)).toEqual({
        editable: false,
        reason: 'missing',
      });
    });

    it('allows an index with runtime fields (they are handled per-column, not as a block)', () => {
      expect(assessIndexEditability(resolution({ runtimeFields: ['day_of_week'] }), opts)).toEqual({
        editable: true,
      });
    });
  });

  describe('editing a lookup index', () => {
    const opts = { indexMode: 'lookup' } as const;

    it('allows a lookup-mode index', () => {
      expect(assessIndexEditability(resolution({ mode: 'lookup' }), opts)).toEqual({
        editable: true,
      });
    });

    it('rejects a standard index when editing in lookup mode', () => {
      expect(assessIndexEditability(resolution({ mode: undefined }), opts)).toEqual({
        editable: false,
        reason: 'unsupportedMode',
      });
    });

    it('rejects a routing-required lookup index too (routing applies to any mode)', () => {
      expect(
        assessIndexEditability(resolution({ mode: 'lookup', routingRequired: true }), opts)
      ).toEqual({ editable: false, reason: 'routingRequired' });
    });
  });

  describe('aliases and data streams', () => {
    it('rejects aliases', () => {
      expect(
        assessIndexEditability(resolution({ kind: 'alias' }), { indexMode: 'standard' })
      ).toEqual({ editable: false, reason: 'alias' });
    });

    it('rejects data streams', () => {
      expect(
        assessIndexEditability(resolution({ kind: 'dataStream' }), { indexMode: 'standard' })
      ).toEqual({ editable: false, reason: 'dataStream' });
    });
  });
});

describe('getIndexEditabilityErrorTitle', () => {
  const reasons: IndexEditabilityReason[] = [
    'missing',
    'alias',
    'dataStream',
    'closed',
    'frozen',
    'routingRequired',
    'unsupportedMode',
    'sourceDisabled',
    'sourceSynthetic',
  ];

  it.each(reasons)('includes the index name for the "%s" reason', (reason) => {
    expect(getIndexEditabilityErrorTitle(reason, 'my-index')).toContain('my-index');
  });
});
