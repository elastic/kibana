/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeIdSchema } from '@kbn/as-code-shared-schemas';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { CoreSetup, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SPACES_EXTENSION_ID } from '@kbn/core/server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { nodeBuilder } from '@kbn/es-query';
import {
  applyEach,
  createSavedObjectOwnership,
  NO_ATTRIBUTES,
  toApplyError,
} from '@kbn/resource-bootstrap-server';
import type { ApplyErrorDetails, JsonValue, ResourceKind } from '@kbn/resource-bootstrap-server';

import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../common/constants';
import { getDashboardStateSchema } from '../api/dashboard_state_schemas';
import { deleteDashboard } from '../api/delete';
import type { DashboardRequestServices } from '../api/types';
import { update } from '../api/update/update';

export const DASHBOARD_KIND_ID = 'dashboard';

interface DeclaredDashboard {
  id: string;
  state: DashboardState;
}

/** Dashboards declared as `{ "id", ...<PUT /api/dashboards/{id} body> }`, applied by its upsert. */
export const createDashboardKind = ({
  core,
}: {
  core: CoreSetup;
}): ResourceKind<DeclaredDashboard> => {
  const getServices = async (spaceId: string): Promise<DashboardRequestServices> => {
    const [coreStart] = await core.getStartServices();
    return {
      savedObjects: {
        client: coreStart.savedObjects.getUnsafeInternalClient().asScopedToNamespace(spaceId),
        typeRegistry: coreStart.savedObjects.getTypeRegistry(),
      },
      security: { authc: { getCurrentUser: () => null } },
    };
  };

  /**
   * Looks dashboards up in every space. The spaces extension checks the spaces against the user of
   * a request, which these writes do not have, so with security enabled it fails; this client
   * leaves it out. It is not scoped to a space, so it only reads, with explicit `namespaces`.
   */
  const getLookupClient = async (): Promise<SavedObjectsClientContract> => {
    const [coreStart] = await core.getStartServices();
    return coreStart.savedObjects.getUnsafeInternalClient({
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
  };

  // Built on first use, since it embeds panel schemas other plugins register later; kinds are
  // only used once every plugin has set up.
  let stateSchema: ReturnType<typeof getDashboardStateSchema> | undefined;
  const getStateSchema = () => (stateSchema ??= getDashboardStateSchema(false));

  /**
   * The spaces other than `spaceId` the dashboard is in. Dashboards are space-isolated, so
   * `bulkGet` rejects a lookup in every space; `find` takes one, matching the stored id, which is
   * `dashboard:<id>` in whatever space the dashboard is.
   */
  const findOtherSpaces = async (
    client: SavedObjectsClientContract,
    id: string,
    spaceId: string
  ): Promise<string[]> => {
    const { saved_objects: found } = await client.find({
      type: DASHBOARD_SAVED_OBJECT_TYPE,
      namespaces: [ALL_NAMESPACES_STRING],
      filter: nodeBuilder.is(
        `${DASHBOARD_SAVED_OBJECT_TYPE}.id`,
        `${DASHBOARD_SAVED_OBJECT_TYPE}:${id}`
      ),
      fields: NO_ATTRIBUTES,
      perPage: 1,
    });
    return found.flatMap(({ namespaces = [] }) => namespaces).filter((space) => space !== spaceId);
  };

  // A dashboard id is unique across spaces, so creating one that lives in another space and that
  // the bootstrap does not own conflicts; say so instead of reporting a bare conflict. Only
  // deleting it there fixes that, so the run is not retried for it.
  const describeError = async ({
    id,
    spaceId,
    error,
    logger,
  }: {
    id: string;
    spaceId: string;
    error: unknown;
    logger: Logger;
  }): Promise<ApplyErrorDetails> => {
    if (!(error instanceof Error) || !SavedObjectsErrorHelpers.isConflictError(error)) {
      return toApplyError(error);
    }
    const otherSpaces = await findOtherSpaces(await getLookupClient(), id, spaceId).catch(
      (lookupError) => {
        logger.warn(
          `Could not tell which space the dashboard "${id}" is in: ${
            toApplyError(lookupError).message
          }`
        );
        return [];
      }
    );
    return otherSpaces.length === 0
      ? toApplyError(error)
      : {
          message: `The dashboard "${id}" already exists in the space "${otherSpaces[0]}", and dashboard ids are unique across spaces. Delete it there, or declare it in "${spaceId}" with another id`,
          permanent: true,
          conflict: true,
        };
  };

  return {
    id: DASHBOARD_KIND_ID,
    // The data views that dashboards reference.
    dependsOn: ['data_view'],
    spaces: 'isolated',
    parse: (document: JsonValue) => {
      if (typeof document !== 'object' || document === null || Array.isArray(document)) {
        throw new Error('expected an object with an "id" and the dashboard body');
      }
      const { id, ...body } = document;
      const state = getStateSchema().parse(body);
      // Access control needs an owning user, which these writes lack.
      if (state.access_control !== undefined) {
        throw new Error(
          '"access_control" is not supported, since dashboards from files have no owning user'
        );
      }
      return { id: asCodeIdSchema.parse(id), state };
    },
    idOf: ({ id }) => id,
    apply: async ({ spaceId, resources, signal, logger }) => {
      const services = await getServices(spaceId);
      const strictSchema = getStateSchema();
      return applyEach({
        resources,
        signal,
        idOf: ({ id }) => id,
        write: async ({ id, state }) => {
          await update(services, strictSchema, id, state, { spaceId });
        },
        describeError: (error, { id }) => describeError({ id, spaceId, error, logger }),
      });
    },
    ownership: {
      // Dashboards are `multiple-isolated`: an id is unique across spaces, but lives in one.
      ...createSavedObjectOwnership({
        type: DASHBOARD_SAVED_OBJECT_TYPE,
        shareable: false,
        getClient: async (spaceId) => (await getServices(spaceId)).savedObjects.client,
      }),
      // Through the dashboard delete function, so history is kept.
      remove: async ({ spaceId, ids, signal }) => {
        const services = await getServices(spaceId);
        const strictSchema = getStateSchema();
        const result = {
          removed: 0,
          errors: [] as Array<{ id: string; message: string }>,
        };

        for (const id of ids) {
          signal.throwIfAborted();
          try {
            await deleteDashboard(services, id, strictSchema, spaceId);
            result.removed++;
          } catch (error) {
            if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
              result.errors.push({ id, message: toApplyError(error).message });
            }
          }
        }

        return result;
      },
    },
  };
};
