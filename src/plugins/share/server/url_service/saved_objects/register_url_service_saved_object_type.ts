/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SavedObjectMigrationFn,
  SavedObjectMigrationMap,
  SavedObjectsServiceSetup,
  SavedObjectsType,
} from 'kibana/server';
import type { LocatorData } from 'src/plugins/share/common/url_service';
import type { ServerUrlService } from '..';
import type { ShortUrlSavedObjectAttributes } from '../short_urls/storage/saved_object_short_url_storage';

export const registerUrlServiceSavedObjectType = (
  so: Pick<SavedObjectsServiceSetup, 'registerType'>,
  service: ServerUrlService
) => {
  const urlSavedObjectType: SavedObjectsType = {
    name: 'url',
    namespaceType: 'single',
    hidden: false,
    management: {
      icon: 'link',
      defaultSearchField: 'url',
      importableAndExportable: true,
      getTitle(obj) {
        return `/goto/${encodeURIComponent(obj.id)}`;
      },
      getInAppUrl(obj) {
        return {
          path: '/goto/' + encodeURIComponent(obj.id),
          uiCapabilitiesPath: '',
        };
      },
    },
    mappings: {
      properties: {
        slug: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
            },
          },
        },
        accessCount: {
          type: 'long',
        },
        accessDate: {
          type: 'date',
        },
        createDate: {
          type: 'date',
        },
        // Legacy field - contains already pre-formatted final URL.
        // This is here to support old saved objects that have this field.
        // TODO: Remove this field and execute a migration to the new format.
        url: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 2048,
            },
          },
        },
        // Information needed to load and execute a locator.
        locatorJSON: {
          type: 'text',
          index: false,
        },
      },
    },
    migrations: () => {
      const locatorMigrations = service.locators.migrations();
      const savedObjectMigrations: SavedObjectMigrationMap = {};
      const versions = new Set<string>();

      for (const migrationMap of Object.values(locatorMigrations))
        for (const version of Object.keys(migrationMap)) versions.add(version);

      for (const version of versions.values()) {
        const migration: SavedObjectMigrationFn<
          ShortUrlSavedObjectAttributes,
          ShortUrlSavedObjectAttributes
        > = (doc) => {
          const locator = JSON.parse(doc.attributes.locatorJSON) as LocatorData;
          const locatorMigrationsMap = locatorMigrations[locator.id];
          if (!locatorMigrationsMap) return doc;

          const migrationFunction = locatorMigrationsMap[version];
          if (!migrationFunction) return doc;

          doc.attributes = {
            ...doc.attributes,
            locatorJSON: JSON.stringify({
              ...locator,
              version,
              state: migrationFunction(locator.state),
            }),
          };

          return doc;
        };

        savedObjectMigrations[version] = migration;
      }

      return savedObjectMigrations;
    },
  };

  so.registerType(urlSavedObjectType);
};
