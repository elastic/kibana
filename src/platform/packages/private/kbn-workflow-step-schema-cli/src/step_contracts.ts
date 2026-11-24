/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawnSync } from 'child_process';
import Fs from 'fs';
import Path from 'path';
import { isObject } from './schema_helpers';
import type { JsonObject, JsonValue } from './types';

/**
 * The contract of a custom workflow step, as the `step_definitions` route returns it
 * (`include_contracts=true`) and as its committed `<id>.json` file stores it. The schemas
 * are JSON Schema in the OpenAPI 3.0 dialect.
 */
export interface StepContract {
  id: string;
  stability: string;
  exposure: string;
  deprecation?: JsonObject;
  input: JsonObject;
  config?: JsonObject;
  output: JsonObject;
}

export interface StepContractsWriteResult {
  added: string[];
  changed: string[];
  removed: string[];
}

const CONTRACT_FILE_EXTENSION = '.json';
// Step ids become file names, so they can't contain path separators.
const STEP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

const isString = (value: JsonValue | undefined): value is string => typeof value === 'string';

/** Checks that a JSON value is a step contract. `source` names it in the error. */
export const parseStepContract = (value: JsonValue, source: string): StepContract => {
  if (!isObject(value)) {
    throw new Error(`${source} is not a step contract: expected an object`);
  }
  const { id, stability, exposure, deprecation, input, config, output } = value;
  if (
    !isString(id) ||
    !isString(stability) ||
    !isString(exposure) ||
    !isObject(input) ||
    !isObject(output)
  ) {
    throw new Error(
      `${source} is not a step contract: expected a string id, stability and exposure, and an object input and output`
    );
  }
  if (!STEP_ID_PATTERN.test(id)) {
    throw new Error(`${source} has an invalid step id "${id}"`);
  }
  if (
    (deprecation !== undefined && !isObject(deprecation)) ||
    (config !== undefined && !isObject(config))
  ) {
    throw new Error(`${source} is not a step contract: deprecation and config must be objects`);
  }
  return {
    id,
    stability,
    exposure,
    ...(deprecation ? { deprecation } : {}),
    input,
    ...(config ? { config } : {}),
    output,
  };
};

const toJsonObject = ({ deprecation, config, ...required }: StepContract): JsonObject => ({
  ...required,
  ...(deprecation ? { deprecation } : {}),
  ...(config ? { config } : {}),
});

// Sorts object keys and `required` lists, so reordering the fields of a schema doesn't change
// its contract file. Other arrays (`enum`, `anyOf`, `oneOf`) keep their order.
const canonicalize = (value: JsonValue, key?: string): JsonValue => {
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalize(item));
    return key === 'required' && items.every(isString) ? [...items].sort() : items;
  }
  if (!isObject(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((childKey) => [childKey, canonicalize(value[childKey], childKey)])
  );
};

/** The content of a step's contract file. */
export const serializeStepContract = (contract: StepContract): string =>
  `${JSON.stringify(canonicalize(toJsonObject(contract)), null, 2)}\n`;

/** Serializes a JSON value the way contract files do, on one line, to compare two values. */
export const serializeCanonicalJson = (value: JsonValue): string =>
  JSON.stringify(canonicalize(value));

const listContractIds = (dir: string): string[] =>
  Fs.existsSync(dir)
    ? Fs.readdirSync(dir)
        .filter((name) => name.endsWith(CONTRACT_FILE_EXTENSION))
        .map((name) => name.slice(0, -CONTRACT_FILE_EXTENSION.length))
    : [];

const contractPath = (dir: string, id: string): string =>
  Path.join(dir, `${id}${CONTRACT_FILE_EXTENSION}`);

/**
 * Writes one `<id>.json` file per contract and deletes the files of steps that are no longer
 * registered, reporting which steps were added, changed and removed.
 */
export const writeStepContracts = (
  contracts: StepContract[],
  dir: string
): StepContractsWriteResult => {
  const previousIds = new Set(listContractIds(dir));
  const currentIds = new Set(contracts.map(({ id }) => id));
  const result: StepContractsWriteResult = { added: [], changed: [], removed: [] };

  Fs.mkdirSync(dir, { recursive: true });
  for (const contract of contracts) {
    const path = contractPath(dir, contract.id);
    const content = serializeStepContract(contract);
    if (!previousIds.has(contract.id)) {
      result.added.push(contract.id);
    } else if (Fs.readFileSync(path, 'utf8') !== content) {
      result.changed.push(contract.id);
    } else {
      continue;
    }
    Fs.writeFileSync(path, content);
  }

  for (const id of previousIds) {
    if (!currentIds.has(id)) {
      Fs.rmSync(contractPath(dir, id));
      result.removed.push(id);
    }
  }
  return result;
};

const parseContractFile = (content: string, source: string, fileId: string): StepContract => {
  const contract = parseStepContract(JSON.parse(content), source);
  if (contract.id !== fileId) {
    throw new Error(`${source} holds the contract of step "${contract.id}"`);
  }
  return contract;
};

/** Reads the contract files of a directory. */
export const readStepContractsFromDir = (dir: string): StepContract[] =>
  listContractIds(dir).map((id) => {
    const path = contractPath(dir, id);
    return parseContractFile(Fs.readFileSync(path, 'utf8'), path, id);
  });

// stderr is kept in the thrown error rather than printed.
const git = (args: string[], cwd: string): string =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const existsInGit = (spec: string, cwd: string): boolean =>
  spawnSync('git', ['cat-file', '-e', spec], { cwd }).status === 0;

/** Reads a file committed at `ref`, or `undefined` when the file doesn't exist there. */
export const readFileFromGit = ({
  ref,
  path,
  repoRoot,
}: {
  ref: string;
  path: string;
  repoRoot: string;
}): string | undefined => {
  // Fails on an unknown ref, rather than reading it as a missing file.
  git(['rev-parse', '--verify', `${ref}^{commit}`], repoRoot);
  return existsInGit(`${ref}:${path}`, repoRoot)
    ? git(['show', `${ref}:${path}`], repoRoot)
    : undefined;
};

/** Reads the contract files committed at `ref`. There are none when `dir` doesn't exist there. */
export const readStepContractsFromGit = ({
  ref,
  dir,
  repoRoot,
}: {
  ref: string;
  dir: string;
  repoRoot: string;
}): StepContract[] => {
  git(['rev-parse', '--verify', `${ref}^{commit}`], repoRoot);
  if (!existsInGit(`${ref}:${dir}`, repoRoot)) {
    return [];
  }
  return git(['ls-tree', '--name-only', `${ref}:${dir}`], repoRoot)
    .split('\n')
    .filter((name) => name.endsWith(CONTRACT_FILE_EXTENSION))
    .map((name) => {
      const path = `${dir}/${name}`;
      const id = name.slice(0, -CONTRACT_FILE_EXTENSION.length);
      return parseContractFile(git(['show', `${ref}:${path}`], repoRoot), `${ref}:${path}`, id);
    });
};
