/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Regression tests for the lazy-loading boundary in schema.ts (see #264175).
 *
 * schema.ts is the sole consumer of connector_action_schema.ts. It defers the
 * require() so the heavy stack_connectors_schema/* and @kbn/connector-specs
 * modules are not loaded at Kibana startup. These tests guard that invariant.
 */

const SEP = __dirname.includes('\\') ? '\\' : '/';
const CONNECTOR_ACTION_SCHEMA_PATH = require.resolve('./connector_action_schema');
const STACK_CONNECTOR_SCHEMA_DIR = `${__dirname}${SEP}stack_connectors_schema`;
const SCHEMA_PATH = require.resolve('./schema');

const CONNECTOR_SPECS_RESOLVED_PATH: string = require.resolve('@kbn/connector-specs');
const CONNECTOR_SPECS_DIR = CONNECTOR_SPECS_RESOLVED_PATH.slice(
  0,
  CONNECTOR_SPECS_RESOLVED_PATH.lastIndexOf(SEP)
);

const isHeavyModule = (p: string) =>
  p === CONNECTOR_ACTION_SCHEMA_PATH ||
  p.startsWith(STACK_CONNECTOR_SCHEMA_DIR + SEP) ||
  p.startsWith(CONNECTOR_SPECS_DIR);

const getLoadedHeavyModules = () => Object.keys(require.cache).filter(isHeavyModule);

describe('schema.ts lazy-loading boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    for (const modulePath of Object.keys(require.cache)) {
      if (modulePath === SCHEMA_PATH || isHeavyModule(modulePath)) {
        delete require.cache[modulePath];
      }
    }
  });

  it('does not load connector_action_schema or its transitive deps when schema.ts is imported', () => {
    require('./schema');
    expect(getLoadedHeavyModules()).toEqual([]);
  });

  it('loads connector_action_schema after a consumer function triggers the boundary', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAllConnectors } = require('./schema') as typeof import('./schema');
    expect(getLoadedHeavyModules()).toEqual([]);

    getAllConnectors();

    expect(getLoadedHeavyModules().length).toBeGreaterThan(0);
  });
});
