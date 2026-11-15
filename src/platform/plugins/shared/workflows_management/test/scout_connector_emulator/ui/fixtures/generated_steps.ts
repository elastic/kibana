/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import path from 'path';
import { getConnectorSpec } from '@kbn/connector-specs';
import { generateActionInputs } from '@kbn/connector-specs/src/test/vendor_api/generate_action_inputs';
import type { ConnectorStep } from './connector_workflow';
import { connectorFolder } from './emulator';

const readJson = async (file: string): Promise<unknown> => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toSnakeCase = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

/** What the connector's actions API takes to run one action: the guard runs a read action with it. */
export interface ActionCall {
  readonly subAction: string;
  readonly subActionParams: Record<string, unknown>;
}

export interface GeneratedWorkflow {
  /** A step per action, in the order of the connector's spec. */
  readonly steps: ConnectorStep[];
  /**
   * A `read` action to run through Kibana before the workflow, to see that its requests reach the
   * emulator. The steps also include actions that change state at the vendor, which must never run
   * unless they do.
   */
  readonly probe: ActionCall;
}

/**
 * The steps of a workflow that runs every action of a connector the emulator can answer, with
 * inputs generated from each action's schema (required properties only, with the overrides in the
 * connector's `vendor_api/fixtures.json`, as when recording), including the actions that change
 * state at the vendor, as the emulator keeps no state and checks their requests against the spec.
 * An action is left out when the connector's vendor API manifest has no operation for it (e.g. one
 * that calls the vendor's MCP server), which the emulator has no spec to answer.
 *
 * @param folder the connector's folder in `src/specs`
 * @param connectorId the connector's `metadata.id`, e.g. `.sentry`
 */
export const generateSteps = async (
  folder: string,
  connectorId: string
): Promise<GeneratedWorkflow> => {
  const spec = getConnectorSpec(connectorId);
  if (!spec) {
    throw new Error(`No connector has the id ${connectorId}`);
  }
  if (!spec.metadata.supportedFeatureIds?.includes('workflows')) {
    throw new Error(
      `${connectorId} isn't enabled for Workflows (supportedFeatureIds), so a workflow can't run it`
    );
  }
  const vendorApi = path.join(connectorFolder(folder), 'vendor_api');
  const manifest = await readJson(path.join(vendorApi, 'manifest.json'));
  if (!isRecord(manifest) || !isRecord(manifest.operations)) {
    throw new Error(`${folder} has no vendor API manifest, which the emulator answers from`);
  }
  const fixtures = await readJson(path.join(vendorApi, 'fixtures.json'));

  const { operations } = manifest;
  const answerable = Object.entries(spec.actions).filter(([action]) => {
    const calls = operations[action];
    return Array.isArray(calls) && calls.length > 0;
  });

  const steps: ConnectorStep[] = [];
  let probe: ActionCall | undefined;
  for (const [action, definition] of answerable) {
    const fixture = isRecord(fixtures) ? fixtures[action] : undefined;
    const override = isRecord(fixture)
      ? [fixture.input].flat().find((input) => input !== undefined)
      : undefined;

    const { inputs, rejected } = await generateActionInputs(definition, override);
    const [input] = inputs;
    if (!isRecord(input)) {
      throw new Error(
        `No input of ${connectorId}.${action} fits its schema${
          rejected.length > 0 ? `: ${rejected[0].message}` : ''
        }. Set one in ${folder}/vendor_api/fixtures.json`
      );
    }
    steps.push([toSnakeCase(action), `${connectorId.replace(/^\./, '')}.${action}`, input]);
    if (probe === undefined && definition.scope === 'read') {
      probe = { subAction: action, subActionParams: input };
    }
  }
  if (probe === undefined) {
    throw new Error(
      `${connectorId} has no read action the emulator can answer, which is needed to check that ` +
        'its requests reach the emulator before any action that changes state runs'
    );
  }
  return { steps, probe };
};
