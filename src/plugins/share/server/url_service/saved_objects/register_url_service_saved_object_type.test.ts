/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import type {
  SavedObjectMigrationMap,
  SavedObjectsType,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core/server';
import { ServerShortUrlClientFactory } from '..';
import { UrlService, LocatorDefinition } from '../../../common/url_service';
import { LegacyShortUrlLocatorDefinition } from '../../../common/url_service/locators/legacy_short_url_locator';
import { MemoryShortUrlStorage } from '../short_urls/storage/memory_short_url_storage';
import { ShortUrlSavedObjectAttributes } from '../short_urls/storage/saved_object_short_url_storage';
import { registerUrlServiceSavedObjectType } from './register_url_service_saved_object_type';

const setup = () => {
  const currentVersion = '7.7.7';
  const service = new UrlService({
    getUrl: () => {
      throw new Error('Not implemented.');
    },
    navigate: () => {
      throw new Error('Not implemented.');
    },
    shortUrls: ({ locators }) =>
      new ServerShortUrlClientFactory({
        currentVersion,
        locators,
      }),
  });
  const definition = new LegacyShortUrlLocatorDefinition();
  const locator = service.locators.create(definition);
  const storage = new MemoryShortUrlStorage();
  const client = service.shortUrls.get({ storage });

  let type: SavedObjectsType;
  registerUrlServiceSavedObjectType(
    {
      registerType: (urlSavedObjectType) => {
        type = urlSavedObjectType;
      },
    },
    service
  );

  return {
    type: type!,
    client,
    service,
    storage,
    locator,
    definition,
    currentVersion,
  };
};

describe('migrations', () => {
  test('returns empty migrations object if there are no migrations', () => {
    const { type } = setup();

    expect((type.migrations as () => SavedObjectMigrationMap)()).toEqual({});
  });

  test('migrates locator to the latest version', () => {
    interface FooLocatorParamsOld extends SerializableRecord {
      color: string;
      indexPattern: string;
    }

    interface FooLocatorParams extends SerializableRecord {
      color: string;
      indexPatterns: string[];
    }

    class FooLocatorDefinition implements LocatorDefinition<FooLocatorParams> {
      public readonly id = 'FOO_LOCATOR';

      public async getLocation() {
        return {
          app: 'foo',
          path: '',
          state: {},
        };
      }

      migrations = {
        '8.0.0': ({ indexPattern, ...rest }: FooLocatorParamsOld): FooLocatorParams => ({
          ...rest,
          indexPatterns: [indexPattern],
        }),
      };
    }

    const { type, service } = setup();

    service.locators.create(new FooLocatorDefinition());

    const migrationFunction = (type.migrations as () => SavedObjectMigrationMap)()['8.0.0'];

    expect(typeof migrationFunction).toBe('function');

    const doc1: SavedObjectUnsanitizedDoc<ShortUrlSavedObjectAttributes> = {
      id: 'foo',
      attributes: {
        accessCount: 0,
        accessDate: 0,
        createDate: 0,
        locatorJSON: JSON.stringify({
          id: 'FOO_LOCATOR',
          version: '7.7.7',
          state: {
            color: 'red',
            indexPattern: 'myIndex',
          },
        }),
        url: '',
      },
      type: 'url',
    };

    const doc2 = migrationFunction(doc1, {} as any);

    expect(doc2.id).toBe('foo');
    expect(doc2.type).toBe('url');
    expect(doc2.attributes.accessCount).toBe(0);
    expect(doc2.attributes.accessDate).toBe(0);
    expect(doc2.attributes.createDate).toBe(0);
    expect(doc2.attributes.url).toBe('');
    expect(JSON.parse(doc2.attributes.locatorJSON)).toEqual({
      id: 'FOO_LOCATOR',
      version: '8.0.0',
      state: {
        color: 'red',
        indexPatterns: ['myIndex'],
      },
    });
  });
});
