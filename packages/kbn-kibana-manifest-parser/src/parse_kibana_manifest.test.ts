/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateKibanaJsonc } from './parse_kibana_jsonc';

const BASE_FIELDS = {
  id: '@kbn/foo',
  owner: '@elastic/kibana-operations',
  typeDeps: [],
  runtimeDeps: [],
};

describe('validateKibanaJsonc', () => {
  it('requires valid type', () => {
    expect(() => validateKibanaJsonc({})).toThrowErrorMatchingInlineSnapshot(
      `"invalid package \\"type\\", options are [functional-tests, plugin-browser, plugin-server, shared-browser, shared-common, shared-server, test-helper]"`
    );
  });

  it('requires valid id', () => {
    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid package \\"id\\", must be a string that starts with @kbn/"`
    );
  });

  it('requires valid owner', () => {
    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
        id: '@kbn/foo',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid package \\"owner\\", must be a valid Github team handle starting with @"`
    );
  });

  it('requires valid typeDeps', () => {
    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
      })
    ).toThrowErrorMatchingInlineSnapshot(`"invalid \\"typeDeps\\", must be an array of strings"`);

    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: false,
      })
    ).toThrowErrorMatchingInlineSnapshot(`"invalid \\"typeDeps\\", must be an array of strings"`);

    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: [1],
      })
    ).toThrowErrorMatchingInlineSnapshot(`"invalid \\"typeDeps\\", must be an array of strings"`);
  });

  it('requires valid runtimeDeps', () => {
    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: [],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid \\"runtimeDeps\\", must be an array of strings"`
    );

    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: [],
        runtimeDeps: false,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid \\"runtimeDeps\\", must be an array of strings"`
    );

    expect(() =>
      validateKibanaJsonc({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: [],
        runtimeDeps: [1],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid \\"runtimeDeps\\", must be an array of strings"`
    );
  });

  it('validates base types', () => {
    expect(
      validateKibanaJsonc({
        type: 'shared-server',
        ...BASE_FIELDS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "@kbn/foo",
        "owner": "@elastic/kibana-operations",
        "runtimeDeps": Array [],
        "tsconfigType": undefined,
        "type": "shared-server",
        "typeDeps": Array [],
      }
    `);
    expect(
      validateKibanaJsonc({
        type: 'functional-tests',
        ...BASE_FIELDS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "@kbn/foo",
        "owner": "@elastic/kibana-operations",
        "runtimeDeps": Array [],
        "tsconfigType": undefined,
        "type": "functional-tests",
        "typeDeps": Array [],
      }
    `);
    expect(
      validateKibanaJsonc({
        type: 'test-helper',
        ...BASE_FIELDS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "@kbn/foo",
        "owner": "@elastic/kibana-operations",
        "runtimeDeps": Array [],
        "tsconfigType": undefined,
        "type": "test-helper",
        "typeDeps": Array [],
      }
    `);
  });

  describe('plugin-* types', () => {
    it('requires valid plugin for plugin-* types', () => {
      expect(() =>
        validateKibanaJsonc({
          type: 'plugin-browser',
          id: '@kbn/foo',
          owner: '@elastic/kibana-operations',
          typeDeps: [],
          runtimeDeps: [],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid package \\"plugin\\", must be an object"`);
    });

    it('requires "id" in plugins', () => {
      expect(() =>
        validateKibanaJsonc({
          type: 'plugin-browser',
          id: '@kbn/foo',
          owner: '@elastic/kibana-operations',
          typeDeps: [],
          runtimeDeps: [],
          plugin: {},
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"invalid \\"plugin.id\\", must be a string in camel or snake case"`
      );

      expect(() =>
        validateKibanaJsonc({
          type: 'plugin-browser',
          id: '@kbn/foo',
          owner: '@elastic/kibana-operations',
          typeDeps: [],
          runtimeDeps: [],
          plugin: {
            id: 'not-camel-case',
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"invalid \\"plugin.id\\", must be a string in camel or snake case"`
      );

      expect(
        validateKibanaJsonc({
          type: 'plugin-browser',
          id: '@kbn/foo',
          owner: '@elastic/kibana-operations',
          typeDeps: [],
          runtimeDeps: [],
          plugin: {
            id: 'camelCase',
          },
        })
      ).toMatchInlineSnapshot(`
        Object {
          "id": "@kbn/foo",
          "owner": "@elastic/kibana-operations",
          "plugin": Object {
            "configPath": undefined,
            "description": undefined,
            "enabledOnAnonymousPages": undefined,
            "id": "camelCase",
            "optionalPlugins": undefined,
            "requiredPlugins": undefined,
            "serviceFolders": undefined,
          },
          "runtimeDeps": Array [],
          "tsconfigType": undefined,
          "type": "plugin-browser",
          "typeDeps": Array [],
        }
      `);
    });
  });
});
