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
import {
  WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS,
  WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_MAX_WAIT_MS,
  WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_REUSE_MAX_WAIT_MS,
} from './workflow_change_history_preview_constants';
import { yamlLanguageService } from '../../shared/ui/yaml_editor/yaml_language_service';

export interface WaitForPreviewYamlSchemaMarkersOptions {
  /** When false, only wait for monaco-yaml markers on the model (schemas already global). */
  registerSchemas?: boolean;
  maxWaitMs?: number;
}

/**
 * Waits for a post-update marker change on the model (debounced), or until
 * {@link maxWaitMs} elapses.
 */
const waitForYamlSchemaMarkersSettle = (
  model: monaco.editor.ITextModel,
  signal: AbortSignal,
  maxWaitMs: number = WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_MAX_WAIT_MS
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const modelUri = model.uri.toString();
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
    let maxWaitTimeout: ReturnType<typeof setTimeout> | null = null;
    let markerListener: monaco.IDisposable | undefined;

    const cleanup = (): void => {
      markerListener?.dispose();
      markerListener = undefined;
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
      }
      if (maxWaitTimeout) {
        clearTimeout(maxWaitTimeout);
        maxWaitTimeout = null;
      }
      signal.removeEventListener('abort', onAbort);
    };

    const settle = (): void => {
      debounceTimeout = setTimeout(() => {
        cleanup();
        resolve();
      }, WORKFLOW_CHANGE_HISTORY_VALIDATION_DEBOUNCE_MS);
    };

    const onAbort = (): void => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    markerListener = monaco.editor.onDidChangeMarkers((changedUris) => {
      if (!changedUris.some((uri) => uri.toString() === modelUri)) {
        return;
      }

      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      settle();
    });

    signal.addEventListener('abort', onAbort);

    maxWaitTimeout = setTimeout(() => {
      cleanup();
      resolve();
    }, maxWaitMs);
  });

/**
 * Waits for yaml schema markers on a preview model. Registers schemas on first use;
 * subsequent calls can reuse the global monaco-yaml instance without another update.
 */
export const waitForPreviewYamlSchemaMarkers = async (
  model: monaco.editor.ITextModel,
  schemas: SchemasSettings[],
  signal: AbortSignal,
  options: WaitForPreviewYamlSchemaMarkersOptions = {}
): Promise<void> => {
  if (schemas.length === 0) {
    return;
  }

  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const registerSchemas = options.registerSchemas ?? true;
  const maxWaitMs =
    options.maxWaitMs ??
    (registerSchemas
      ? WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_MAX_WAIT_MS
      : WORKFLOW_CHANGE_HISTORY_VALIDATION_MARKER_REUSE_MAX_WAIT_MS);

  if (registerSchemas) {
    const settlePromise = waitForYamlSchemaMarkersSettle(model, signal, maxWaitMs);
    await yamlLanguageService.update(schemas);

    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    await settlePromise;
    return;
  }

  await waitForYamlSchemaMarkersSettle(model, signal, maxWaitMs);
};
