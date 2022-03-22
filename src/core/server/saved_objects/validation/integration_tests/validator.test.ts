/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Util from 'util';
import { Env } from '@kbn/config';
import { schema } from '@kbn/config-schema';
import { REPO_ROOT } from '@kbn/utils';
import { SavedObjectsType } from '../../types';
import { ISavedObjectsRepository } from '../../service/lib';
import { getEnvOptions } from '../../../config/mocks';
import { InternalCoreSetup, InternalCoreStart } from '../../../internal_types';
import { Root } from '../../../root';
import * as kbnTestServer from '../../../../test_helpers/kbn_server';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const logFilePath = Path.join(__dirname, 'saved_object_type_validation.log');

const asyncUnlink = Util.promisify(Fs.unlink);

async function removeLogFile() {
  // ignore errors if it doesn't exist
  await asyncUnlink(logFilePath).catch(() => void 0);
}

function createRoot() {
  return kbnTestServer.createRootWithCorePlugins(
    {
      migrations: {
        skip: false,
      },
      logging: {
        appenders: {
          file: {
            type: 'file',
            fileName: logFilePath,
            layout: {
              type: 'json',
            },
          },
        },
        loggers: [
          {
            name: 'root',
            appenders: ['file'],
          },
        ],
      },
    },
    {
      oss: true,
    }
  );
}

// To keep this suite from running too long, we are only setting up ES once and registering
// a handful of SO types to test different scenarios. This means we need to take care when
// adding new tests, as ES will not be cleaned up in between each test run.
const savedObjectTypes: SavedObjectsType[] = [
  {
    name: 'schema-using-kbn-config',
    hidden: false,
    mappings: {
      properties: {
        a: { type: 'integer' },
        b: { type: 'text' },
      },
    },
    migrations: {
      [kibanaVersion]: (doc) => doc,
    },
    namespaceType: 'agnostic',
    schemas: {
      [kibanaVersion]: schema.object({
        a: schema.number(),
        b: schema.string(),
      }),
    },
  },
  {
    name: 'no-schema',
    hidden: false,
    mappings: {
      properties: {
        a: { type: 'integer' },
        b: { type: 'text' },
      },
    },
    migrations: {
      [kibanaVersion]: (doc) => doc,
    },
    namespaceType: 'agnostic',
  },
  {
    name: 'migration-error',
    hidden: false,
    mappings: {
      properties: {
        a: { type: 'integer' },
        b: { type: 'text' },
      },
    },
    migrations: {
      [kibanaVersion]: (doc) => {
        throw new Error('migration error'); // intentionally create a migration error
      },
    },
    namespaceType: 'agnostic',
    schemas: {
      [kibanaVersion]: schema.object({
        a: schema.number(),
        b: schema.string(),
      }),
    },
  },
];

describe('validates saved object types when a schema is provided', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let root: Root;
  let coreSetup: InternalCoreSetup;
  let coreStart: InternalCoreStart;
  let savedObjectsClient: ISavedObjectsRepository;

  beforeAll(async () => {
    await removeLogFile();

    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'basic',
        },
      },
    });

    root = createRoot();
    esServer = await startES();

    await root.preboot();
    coreSetup = await root.setup();

    savedObjectTypes.forEach((type) => coreSetup.savedObjects.registerType(type));

    coreStart = await root.start();
    savedObjectsClient = coreStart.savedObjects.createInternalRepository();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
  });

  it('does nothing when no schema is provided', async () => {
    const { attributes } = await savedObjectsClient.create(
      'no-schema',
      {
        a: 1,
        b: 'heya',
      },
      { migrationVersion: { bar: '7.16.0' } }
    );
    expect(attributes).toEqual(
      expect.objectContaining({
        a: 1,
        b: 'heya',
      })
    );
  });

  it('is superseded by migration errors and does not run if a migration fails', async () => {
    expect(async () => {
      await savedObjectsClient.create(
        'migration-error',
        {
          a: 1,
          b: 2, // invalid, would throw validation error if migration didn't fail first
        },
        { migrationVersion: { foo: '7.16.0' } }
      );
    }).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Migration function for version 8.1.2 threw an error"`
    );
  });

  it('returns validation errors with bulkCreate', async () => {
    const validObj = {
      type: 'schema-using-kbn-config',
      id: 'bulk-valid',
      attributes: {
        a: 1,
        b: 'heya',
      },
    };
    const invalidObj = {
      type: 'schema-using-kbn-config',
      id: 'bulk-invalid',
      attributes: {
        a: 'oops',
        b: 'heya',
      },
    };

    // @ts-expect-error - The invalidObj is intentionally malformed for testing
    const results = await savedObjectsClient.bulkCreate([validObj, invalidObj]);

    expect(results.saved_objects).toEqual([
      expect.objectContaining(validObj),
      expect.objectContaining({
        error: new Error(
          '[attributes.a]: expected value of type [number] but got [string]: Bad Request'
        ),
        id: 'bulk-invalid',
        type: 'schema-using-kbn-config',
      }),
    ]);
  });

  describe('when validating with a config schema', () => {
    it('throws when an invalid attribute is provided', async () => {
      expect(async () => {
        await savedObjectsClient.create(
          'schema-using-kbn-config',
          {
            a: 1,
            b: 2,
          },
          { migrationVersion: { foo: '7.16.0' } }
        );
      }).rejects.toThrowErrorMatchingInlineSnapshot(
        `"[attributes.b]: expected value of type [string] but got [number]: Bad Request"`
      );
    });

    it('does not throw when valid attributes are provided', async () => {
      const { attributes } = await savedObjectsClient.create(
        'schema-using-kbn-config',
        {
          a: 1,
          b: 'heya',
        },
        { migrationVersion: { foo: '7.16.0' } }
      );
      expect(attributes).toEqual(
        expect.objectContaining({
          a: 1,
          b: 'heya',
        })
      );
    });
  });
});
