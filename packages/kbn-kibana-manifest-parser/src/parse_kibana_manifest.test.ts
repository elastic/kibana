/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateKibanaManifest } from './parse_kibana_manifest';

const BASE_FIELDS = {
  id: '@kbn/foo',
  owner: '@elastic/kibana-operations',
  typeDeps: [],
  runtimeDeps: [],
};

describe('validateKibanaManifest', () => {
  it('requires valid type', () => {
    expect(() => validateKibanaManifest({})).toThrowErrorMatchingInlineSnapshot(
      `"invalid package \\"type\\", options are [functional-tests, plugin-browser, plugin-server, shared-browser, shared-common, shared-server, test-helper, shared-scss]"`
    );
  });

  it('requires valid id', () => {
    expect(() =>
      validateKibanaManifest({
        type: 'plugin-browser',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid package \\"id\\", must be a string that starts with @kbn/"`
    );
  });

  it('requires valid owner', () => {
    expect(() =>
      validateKibanaManifest({
        type: 'plugin-browser',
        id: '@kbn/foo',
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid package \\"owner\\", must be a valid Github team handle starting with @"`
    );
  });

  it('requires valid typeDeps', () => {
    expect(() =>
      validateKibanaManifest({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
      })
    ).toThrowErrorMatchingInlineSnapshot(`"invalid \\"typeDeps\\", must be an array of strings"`);

    expect(() =>
      validateKibanaManifest({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: false,
      })
    ).toThrowErrorMatchingInlineSnapshot(`"invalid \\"typeDeps\\", must be an array of strings"`);

    expect(() =>
      validateKibanaManifest({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: [1],
      })
    ).toThrowErrorMatchingInlineSnapshot(`"invalid \\"typeDeps\\", must be an array of strings"`);
  });

  it('requires valid runtimeDeps', () => {
    expect(() =>
      validateKibanaManifest({
        type: 'plugin-browser',
        id: '@kbn/foo',
        owner: '@elastic/kibana-operations',
        typeDeps: [],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"invalid \\"runtimeDeps\\", must be an array of strings"`
    );

    expect(() =>
      validateKibanaManifest({
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
      validateKibanaManifest({
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
      validateKibanaManifest({
        type: 'shared-server',
        ...BASE_FIELDS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "@kbn/foo",
        "owner": "@elastic/kibana-operations",
        "runtimeDeps": Array [],
        "type": "shared-server",
        "typeDeps": Array [],
      }
    `);
    expect(
      validateKibanaManifest({
        type: 'functional-tests',
        ...BASE_FIELDS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "@kbn/foo",
        "owner": "@elastic/kibana-operations",
        "runtimeDeps": Array [],
        "type": "functional-tests",
        "typeDeps": Array [],
      }
    `);
    expect(
      validateKibanaManifest({
        type: 'test-helper',
        ...BASE_FIELDS,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "@kbn/foo",
        "owner": "@elastic/kibana-operations",
        "runtimeDeps": Array [],
        "type": "test-helper",
        "typeDeps": Array [],
      }
    `);
  });

  describe('plugin-* types', () => {
    it('requires valid plugin for plugin-* types', () => {
      expect(() =>
        validateKibanaManifest({
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
        validateKibanaManifest({
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
        validateKibanaManifest({
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
        validateKibanaManifest({
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
          "type": "plugin-browser",
          "typeDeps": Array [],
        }
      `);
    });
  });
});
