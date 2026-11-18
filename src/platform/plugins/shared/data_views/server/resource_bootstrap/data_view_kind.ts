/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult, SPACES_EXTENSION_ID } from '@kbn/core/server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  applyEach,
  createSavedObjectOwnership,
  NO_ATTRIBUTES,
  toApplyError,
} from '@kbn/resource-bootstrap-server';
import type { ApplyErrorDetails, JsonValue, ResourceKind } from '@kbn/resource-bootstrap-server';

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../common/constants';
import { DuplicateDataViewError } from '../../common/errors';
import type { DataViewSpec } from '../../common/types';
import { dataViewSpecSchema } from '../rest_api_routes/schema';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../types';

export const DATA_VIEW_KIND_ID = 'data_view';

const NOT_FOUND = 404;

type DeclaredDataView = ReturnType<typeof dataViewSpecSchema.validate> & { id: string };

const sameSpaces = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((space) => b.includes(space));

/**
 * Why a data view cannot take a name `others` have. A data view the files declare under another
 * name gives it up once that one is applied, so only then can a retry fix it.
 */
const describeTakenName = (
  name: string,
  others: readonly string[],
  declaredNames: ReadonlyMap<string, string>
): ApplyErrorDetails => {
  const sameName = others.filter((other) => declaredNames.get(other) === name);
  if (sameName.length > 0) {
    return {
      message: `The name "${name}" is also declared for the data view ${sameName.join(
        ', '
      )}. Give each data view its own name`,
      permanent: true,
    };
  }
  if (others.every((other) => declaredNames.has(other))) {
    return {
      message: `The name "${name}" is still used by the data view ${others.join(
        ', '
      )}, which these files also declare. The run is retried once that data view gives the name up; two data views cannot swap names in one change`,
    };
  }
  return {
    message: `The name "${name}" is already used by the data view ${others.join(
      ', '
    )}. Use a different name, or declare that data view's id`,
    permanent: true,
  };
};

/**
 * Data views declared as the `POST /api/data_views/data_view` body, with a required `id`. A data
 * view is one object in every space its document names, and only in those: spaces it was shared
 * with by hand are removed when it is applied.
 */
export const createDataViewKind = ({
  core,
}: {
  core: CoreSetup<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>;
}): ResourceKind<DeclaredDataView> => {
  const getServices = async (spaceId: string) => {
    const [coreStart, , { dataViewsServiceFactory }] = await core.getStartServices();
    const internalClient = coreStart.savedObjects.getUnsafeInternalClient();
    const savedObjectsClient = internalClient.asScopedToNamespace(spaceId);
    const service = await dataViewsServiceFactory(
      savedObjectsClient,
      coreStart.elasticsearch.client.asInternalUser,
      undefined,
      true
    );
    return { service, savedObjectsClient, internalClient };
  };

  /**
   * Looks data views up in the spaces a call names. The spaces extension checks those spaces
   * against the user of a request, which these writes do not have, so with security enabled it
   * fails; this client leaves it out. It is not scoped to a space, so it only reads, with explicit
   * `namespaces`.
   */
  const getLookupClient = async (): Promise<SavedObjectsClientContract> => {
    const [coreStart] = await core.getStartServices();
    return coreStart.savedObjects.getUnsafeInternalClient({
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
  };

  /**
   * The spaces the data view is in, wherever it is, which are never empty, or `undefined` when it
   * does not exist.
   */
  const findSpaces = async (
    savedObjectsClient: SavedObjectsClientContract,
    id: string
  ): Promise<string[] | undefined> => {
    const {
      saved_objects: [found],
    } = await savedObjectsClient.bulkGet([
      {
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id,
        fields: NO_ATTRIBUTES,
        namespaces: [ALL_NAMESPACES_STRING],
      },
    ]);
    if (!isSavedObjectErrorResult(found)) {
      const { namespaces = [] } = found;
      if (namespaces.length === 0) {
        throw new Error(`The data view "${id}" exists but is in no space`);
      }
      return namespaces;
    }
    if (found.error.statusCode === NOT_FOUND) {
      return undefined;
    }
    throw new Error(found.error.message);
  };

  /** Makes the data view live in exactly `spaces`, adding and removing spaces as needed. */
  const alignSpaces = async (
    internalClient: SavedObjectsClientContract,
    id: string,
    current: readonly string[],
    spaces: readonly string[]
  ): Promise<void> => {
    const spacesToAdd = spaces.filter((space) => !current.includes(space));
    const spacesToRemove = current.filter((space) => !spaces.includes(space));
    if (spacesToAdd.length === 0 && spacesToRemove.length === 0) {
      return;
    }
    // The change goes through a space the data view is in now, since it is not found elsewhere;
    // `findSpaces` never returns an empty list.
    const scope = current.includes(ALL_NAMESPACES_STRING) ? spaces[0] : current[0];
    const { objects } = await internalClient
      .asScopedToNamespace(scope)
      .updateObjectsSpaces(
        [{ type: DATA_VIEW_SAVED_OBJECT_TYPE, id }],
        spacesToAdd,
        spacesToRemove
      );
    const failed = objects.find(({ error }) => error);
    if (failed?.error) {
      throw new Error(failed.error.message);
    }
  };

  // Escapes quotes and backslashes so a name cannot alter the query around it.
  const toPhrase = (name: string): string => `"${name.replace(/[\\"]/g, '\\$&')}"`;

  // Names must stay unique: the service refuses a new data view with a taken name, and overwriting
  // in place would save a duplicate. Unlike `findByName`, this returns every match, in every space
  // the data view is declared in, and escapes the name.
  const findIdsWithName = async (
    savedObjectsClient: SavedObjectsClientContract,
    name: string,
    spaces: readonly string[]
  ): Promise<string[]> => {
    const { saved_objects: found } = await savedObjectsClient.find({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      perPage: 10,
      search: toPhrase(name),
      searchFields: ['name.keyword'],
      fields: ['name'],
      namespaces: [...spaces],
    });
    return found.map(({ id }) => id);
  };

  return {
    id: DATA_VIEW_KIND_ID,
    spaces: 'shared',
    supportsManaged: true,
    parse: (document: JsonValue) => {
      const spec = dataViewSpecSchema.validate(document);
      const { id } = spec;
      if (id === undefined) {
        throw new Error('"id" is required so that repeated applies update the same data view');
      }
      return { ...spec, id };
    },
    idOf: ({ id }) => id,
    apply: async ({ spaceId, spaces, resources, declared: declaredViews, managed, signal }) => {
      const { service, savedObjectsClient, internalClient } = await getServices(spaceId);
      const lookupClient = await getLookupClient();
      // Across every set of spaces, since a data view declared for others may hold a name here.
      const declaredNames = new Map(
        declaredViews.map(({ id, name, title }) => [id, name || title])
      );
      return applyEach({
        resources,
        signal,
        idOf: ({ id }) => id,
        write: async (spec) => {
          // `spaces` says where the data view lives, so `namespaces` may only repeat it.
          const { namespaces } = spec;
          if (namespaces && !sameSpaces(namespaces, spaces)) {
            return {
              message: `"namespaces" must name the same spaces as "spaces" (${spaces.join(
                ', '
              )}), or be left out`,
              permanent: true,
            };
          }

          const name = spec.name || spec.title;
          const others = name
            ? (await findIdsWithName(lookupClient, name, spaces)).filter((id) => id !== spec.id)
            : [];
          if (others.length > 0) {
            return describeTakenName(name, others, declaredNames);
          }

          const current = await findSpaces(lookupClient, spec.id);
          // The schema output is read-only; the REST route casts the same way.
          const declared = { ...spec, name, managed, namespaces: [...spaces] } as DataViewSpec;
          if (current === undefined) {
            await service.createAndSaveDataViewLazy(declared, false);
          } else {
            await alignSpaces(internalClient, spec.id, current, spaces);
            // Overwrite in place, which keeps the spaces just aligned.
            const dataView = await service.createFromSpecLazy(declared);
            await savedObjectsClient.create(
              DATA_VIEW_SAVED_OBJECT_TYPE,
              dataView.getAsSavedObjectBody(),
              { id: spec.id, overwrite: true, managed }
            );
          }
        },
        describeError: (error) => ({
          ...toApplyError(error),
          // The service refuses a create whose name another data view took since the check above.
          ...(error instanceof DuplicateDataViewError && { conflict: true }),
        }),
      });
    },
    ownership: createSavedObjectOwnership({
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      shareable: true,
      getClient: async (spaceId) => (await getServices(spaceId)).savedObjectsClient,
      getLookupClient,
    }),
  };
};
