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
import { getConnectorSpec } from '../../get_connector_spec';
import { generateActionInputs } from './generate_action_inputs';

const SPECS = path.resolve(__dirname, '../../specs');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

export interface VendorOperation {
  readonly source: string;
  readonly method: string;
  readonly path: string;
}

export interface ReadAction {
  readonly action: string;
  readonly input: Record<string, unknown>;
  /** The one vendor operation the action calls. */
  readonly operation: VendorOperation;
}

/**
 * A `read` action of a connector that calls exactly one vendor operation, with an input generated
 * from its schema (and the override in the connector's `vendor_api/fixtures.json`), so a response
 * set for that operation is the response to the action.
 *
 * @param folder the connector's folder in `src/specs`
 * @param connectorId the connector's `metadata.id`
 */
export const findReadAction = async (folder: string, connectorId: string): Promise<ReadAction> => {
  const spec = getConnectorSpec(connectorId);
  if (!spec) {
    throw new Error(`No connector has the id ${connectorId}`);
  }
  const vendorApi = path.join(SPECS, folder, 'vendor_api');
  const manifest = await readJson(path.join(vendorApi, 'manifest.json'));
  const fixtures = await readJson(path.join(vendorApi, 'fixtures.json'));
  if (!isRecord(manifest) || !isRecord(manifest.operations)) {
    throw new Error(`${folder} has no vendor API manifest`);
  }

  const { operations: vendorOperations } = manifest;
  const candidate = Object.entries(spec.actions)
    .map(([action, definition]) => ({
      action,
      definition,
      operations: vendorOperations[action],
    }))
    .find(
      ({ definition, operations }) =>
        definition.scope === 'read' && Array.isArray(operations) && operations.length === 1
    );
  if (candidate) {
    const { action, definition, operations } = candidate;
    const [operation] = Array.isArray(operations) ? operations : [];
    const fixture = isRecord(fixtures) ? fixtures[action] : undefined;
    const override = isRecord(fixture)
      ? [fixture.input].flat().find((input) => input !== undefined)
      : undefined;
    const { inputs } = await generateActionInputs(definition, override);
    const [input] = inputs;
    if (isRecord(input) && isRecord(operation)) {
      const { source, method, path: operationPath } = operation;
      return {
        action,
        input,
        operation: { source: String(source), method: String(method), path: String(operationPath) },
      };
    }
  }
  throw new Error(`${connectorId} has no read action that calls one vendor operation`);
};
