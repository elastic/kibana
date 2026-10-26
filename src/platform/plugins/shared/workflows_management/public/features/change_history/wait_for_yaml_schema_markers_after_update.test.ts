/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SchemasSettings } from 'monaco-yaml';
import { monaco } from '@kbn/code-editor';
import { waitForPreviewYamlSchemaMarkers } from './wait_for_yaml_schema_markers_after_update';
import {
  WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS,
  WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_MAX_WAIT_MS,
  WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_REUSE_MAX_WAIT_MS,
} from './workflow_change_history_preview_constants';

jest.mock('../../shared/ui/yaml_editor/yaml_language_service', () => ({
  yamlLanguageService: {
    update: jest.fn(() => Promise.resolve()),
  },
}));

const { yamlLanguageService } = jest.requireMock(
  '../../shared/ui/yaml_editor/yaml_language_service'
) as {
  yamlLanguageService: { update: jest.Mock };
};

const sampleSchemas: SchemasSettings[] = [
  { fileMatch: ['*'], uri: 'file:///schema.json', schema: { type: 'object' as const } },
];

describe('wait_for_yaml_schema_markers_after_update', () => {
  let model: monaco.editor.ITextModel;
  let markerChangeListener: ((uris: monaco.Uri[]) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    markerChangeListener = undefined;
    model = monaco.editor.createModel('name: test\n', 'yaml');

    const originalOnDidChangeMarkers = monaco.editor.onDidChangeMarkers.bind(monaco.editor);
    jest.spyOn(monaco.editor, 'onDidChangeMarkers').mockImplementation((listener) => {
      markerChangeListener = listener;
      return originalOnDidChangeMarkers(listener);
    });
  });

  afterEach(() => {
    model.dispose();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('skips work when schemas are empty', async () => {
    const controller = new AbortController();

    await waitForPreviewYamlSchemaMarkers(model, [], controller.signal);

    expect(yamlLanguageService.update).not.toHaveBeenCalled();
  });

  it('updates schemas then waits for debounced marker change', async () => {
    const controller = new AbortController();

    const waitPromise = waitForPreviewYamlSchemaMarkers(model, sampleSchemas, controller.signal, {
      registerSchemas: true,
    });

    await Promise.resolve();
    expect(yamlLanguageService.update).toHaveBeenCalledWith(sampleSchemas);

    markerChangeListener?.([model.uri]);
    jest.advanceTimersByTime(WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS);

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('does not short-circuit on cached yaml markers without a marker event', async () => {
    monaco.editor.setModelMarkers(model, 'yaml', [
      {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 5,
        message: 'Cached marker',
        severity: monaco.MarkerSeverity.Error,
      },
    ]);

    const controller = new AbortController();
    let pending = true;
    const waitPromise = waitForPreviewYamlSchemaMarkers(model, sampleSchemas, controller.signal, {
      registerSchemas: true,
    }).finally(() => {
      pending = false;
    });

    await Promise.resolve();
    expect(yamlLanguageService.update).toHaveBeenCalledWith(sampleSchemas);

    jest.advanceTimersByTime(WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS);
    expect(pending).toBe(true);

    jest.advanceTimersByTime(
      WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_MAX_WAIT_MS -
        WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS
    );

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('resolves after max wait when no marker event fires', async () => {
    const controller = new AbortController();
    const waitPromise = waitForPreviewYamlSchemaMarkers(model, sampleSchemas, controller.signal, {
      registerSchemas: true,
    });

    await Promise.resolve();
    jest.advanceTimersByTime(WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_MAX_WAIT_MS);

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('rejects when the signal is aborted during marker settle', async () => {
    const controller = new AbortController();
    const waitPromise = waitForPreviewYamlSchemaMarkers(model, sampleSchemas, controller.signal, {
      registerSchemas: true,
    });

    await Promise.resolve();
    controller.abort();

    await expect(waitPromise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('waits for markers without schema registration when registerSchemas is false', async () => {
    const controller = new AbortController();
    const waitPromise = waitForPreviewYamlSchemaMarkers(model, sampleSchemas, controller.signal, {
      registerSchemas: false,
    });

    await Promise.resolve();
    expect(yamlLanguageService.update).not.toHaveBeenCalled();

    markerChangeListener?.([model.uri]);
    jest.advanceTimersByTime(WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS);

    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('uses the shorter reuse max wait when schemas are not registered', async () => {
    const controller = new AbortController();
    let pending = true;
    const waitPromise = waitForPreviewYamlSchemaMarkers(model, sampleSchemas, controller.signal, {
      registerSchemas: false,
    }).finally(() => {
      pending = false;
    });

    await Promise.resolve();
    jest.advanceTimersByTime(WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_REUSE_MAX_WAIT_MS);

    await expect(waitPromise).resolves.toBeUndefined();
    expect(pending).toBe(false);
  });
});
