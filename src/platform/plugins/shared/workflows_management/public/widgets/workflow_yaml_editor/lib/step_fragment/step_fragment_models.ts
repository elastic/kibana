/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { StepFragmentVirtualYaml } from './step_fragment_virtual_yaml';
import type { ComputedData } from '../../../../entities/workflows/store/workflow_detail/types';

/** URI fragment every step-fragment editor model's path starts with. */
const STEP_FRAGMENT_URI_PATH_PREFIX = 'workflow-step-fragment-';

/**
 * monaco-yaml `fileMatch` exclusion for the full-workflow JSON schema: step
 * fragment editors show a single de-indented step, so the schema (which
 * expects top-level `name`/`triggers`/`steps`) would otherwise flag them as
 * invalid. They still validate — against a hidden full-document shadow model,
 * mapped back to fragment coordinates (see `attachStepFragmentYamlSupport`).
 */
export const STEP_FRAGMENT_SCHEMA_FILE_MATCH_EXCLUSION = `!${STEP_FRAGMENT_URI_PATH_PREFIX}*`;

let nextStepFragmentModelId = 0;

/** A fresh URI for a step-fragment editor model, excluded from the full-workflow JSON schema. */
export const createStepFragmentModelUri = (): monaco.Uri =>
  monaco.Uri.from({
    scheme: 'inmemory',
    authority: 'model',
    path: `/${STEP_FRAGMENT_URI_PATH_PREFIX}${++nextStepFragmentModelId}.yaml`,
  });

/**
 * True when `model` is a step-fragment editor model. Checked against
 * `uri.toString()` (rather than `uri.path`) so it also works against the
 * minimal `{ uri: { toString } }` model mocks used in provider unit tests.
 * `model.uri` itself is optional here only because some existing test
 * fixtures mock a model without one — every real `ITextModel` has one.
 */
export const isStepFragmentModel = (model: Pick<monaco.editor.ITextModel, 'uri'>): boolean =>
  Boolean(model.uri?.toString().includes(STEP_FRAGMENT_URI_PATH_PREFIX));

/** The shadow full-document model and data a step-fragment model validates/autocompletes against. */
export interface StepFragmentTarget {
  readonly model: monaco.editor.ITextModel;
  readonly virtual: StepFragmentVirtualYaml;
  readonly computed: ComputedData;
}

const resolversByFragmentUri = new Map<string, () => StepFragmentTarget | undefined>();

/**
 * Registers how to resolve a step-fragment model's current shadow target.
 * Called once per fragment editor mount; the returned disposable must be
 * disposed when that editor unmounts.
 */
export const registerStepFragmentModel = (
  model: monaco.editor.ITextModel,
  resolve: () => StepFragmentTarget | undefined
): monaco.IDisposable => {
  const key = model.uri.toString();
  resolversByFragmentUri.set(key, resolve);
  return {
    dispose: () => {
      if (resolversByFragmentUri.get(key) === resolve) {
        resolversByFragmentUri.delete(key);
      }
    },
  };
};

/** Resolves a step-fragment model's current shadow target, or `undefined` if unregistered. */
export const resolveStepFragmentTarget = (
  model: monaco.editor.ITextModel
): StepFragmentTarget | undefined => resolversByFragmentUri.get(model.uri.toString())?.();
