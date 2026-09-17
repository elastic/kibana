/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Production Workflows common/public code must not value-import @kbn/connector-specs
 * (see #283868). Type-only imports are allowed and do not populate require.cache.
 */

const SEP = __dirname.includes('\\') ? '\\' : '/';
const CONNECTOR_SPECS_RESOLVED_PATH: string = require.resolve('@kbn/connector-specs');
const CONNECTOR_SPECS_DIR = CONNECTOR_SPECS_RESOLVED_PATH.slice(
  0,
  CONNECTOR_SPECS_RESOLVED_PATH.lastIndexOf(SEP)
);

const isConnectorSpecsModule = (p: string) => p.startsWith(CONNECTOR_SPECS_DIR);
const getLoadedConnectorSpecsModules = () =>
  Object.keys(require.cache).filter(isConnectorSpecsModule);

const clearConnectorSpecsFromCache = () => {
  for (const modulePath of Object.keys(require.cache)) {
    if (isConnectorSpecsModule(modulePath)) {
      delete require.cache[modulePath];
    }
  }
};

describe('connector-specs browser boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    clearConnectorSpecsFromCache();
  });

  it('does not load @kbn/connector-specs from connector_action_schema.ts', () => {
    require('./connector_action_schema');
    expect(getLoadedConnectorSpecsModules()).toEqual([]);
  });

  it('does not load @kbn/connector-specs from schema.ts after getAllConnectors()', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAllConnectors } = require('./schema') as typeof import('./schema');
    getAllConnectors();
    expect(getLoadedConnectorSpecsModules()).toEqual([]);
  });

  it('does not load @kbn/connector-specs from connector_event_triggers.ts', () => {
    require('./triggers/connector_event_triggers');
    expect(getLoadedConnectorSpecsModules()).toEqual([]);
  });

  it('does not load @kbn/connector-specs from public register_connector_event_triggers.ts', () => {
    require('../public/triggers/register_connector_event_triggers');
    expect(getLoadedConnectorSpecsModules()).toEqual([]);
  });
});
