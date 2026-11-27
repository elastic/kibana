/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter } from '@kbn/core/server';
import { MAX_NAME_LENGTH, SAVED_OBJECT_ROUTE } from '../../common';
import {
  findImplicitReferences,
  savedObjectAssociations,
  TASK_SAVED_OBJECT_TYPE,
} from '../../common/associations';
import type {
  SavedObjectAssociation,
  SavedObjectDetailResponse,
  SavedObjectReferenceSummary,
} from '../../common/saved_objects';
import { SAVED_OBJECTS_PAGE_SIZE } from '../../common/saved_objects';
import { buildQuery } from '../lib/build_query';
import { errorMessage, toErrorResponse } from '../lib/error_response';
import { routeSecurity } from '../lib/route_config';
import {
  getSavedObjectsAccess,
  getTitle,
  redactAttributes,
  toNamespace,
  toSummary,
} from '../lib/saved_objects';

export function registerSavedObjectRoute(router: IRouter) {
  router.get(
    {
      path: SAVED_OBJECT_ROUTE,
      security: routeSecurity,
      validate: {
        query: schema.object({
          type: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
          id: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
          space: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH })),
        }),
      },
    },
    async (context, request, response) => {
      const { type, id, space } = request.query;
      const { client, typeRegistry, typeNames } = await getSavedObjectsAccess(context);
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      if (!typeRegistry.getType(type)) {
        return response.notFound({ body: { message: `Unknown saved object type [${type}]` } });
      }

      try {
        const namespace = toNamespace(space);
        const object = await client.get<unknown>(type, id, { namespace });

        const resolved =
          object.references.length > 0
            ? await client.bulkGet<unknown>(
                object.references.map((ref) => ({ type: ref.type, id: ref.id })),
                { namespace }
              )
            : { saved_objects: [] };
        const explicitReferences = object.references.map((ref, i) => {
          const target = resolved.saved_objects[i];
          const found = target && 'attributes' in target ? target : undefined;
          return {
            name: ref.name,
            type: ref.type,
            id: ref.id,
            missing: !found,
            implicit: false,
            title: found ? getTitle(typeRegistry, found) : undefined,
          };
        });

        const implicit = findImplicitReferences(type, object.attributes).filter((ref) =>
          typeRegistry.getType(ref.type)
        );
        const implicitReferences = await Promise.all(
          implicit.map(async (ref): Promise<SavedObjectReferenceSummary> => {
            const refSpace = ref.space ?? space;
            const target = await client
              .get<unknown>(ref.type, ref.id, { namespace: toNamespace(refSpace) })
              .catch(() => undefined);
            return {
              ...ref,
              space: refSpace,
              missing: !target,
              implicit: true,
              title: target ? getTitle(typeRegistry, target) : undefined,
            };
          })
        );
        const references: SavedObjectReferenceSummary[] = [
          ...implicitReferences,
          ...explicitReferences,
        ];
        const taskId = implicit.find((ref) => ref.type === TASK_SAVED_OBJECT_TYPE)?.id;

        const [inbound, associations] = await Promise.all([
          client.find<unknown>({
            type: typeNames,
            hasReference: { type, id },
            perPage: SAVED_OBJECTS_PAGE_SIZE,
            namespaces: ['*'],
            sortField: 'updated_at',
            sortOrder: 'desc',
          }),
          countAssociations(esClient, savedObjectAssociations(type, id, taskId)),
        ]);

        const { attributes, ...rest } = object;
        const redacted = redactAttributes(attributes);
        const body: SavedObjectDetailResponse = {
          object: {
            ...toSummary(typeRegistry, object),
            attributes: redacted,
            raw: { ...Object.fromEntries(Object.entries(rest)), attributes: redacted },
          },
          references,
          referencedBy: inbound.saved_objects.map((inboundObject) =>
            toSummary(typeRegistry, inboundObject)
          ),
          referencedByTotal: inbound.total,
          associations,
        };
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
}

async function countAssociations(
  esClient: ElasticsearchClient,
  associations: readonly SavedObjectAssociation[]
): Promise<SavedObjectAssociation[]> {
  return Promise.all(
    associations.map(async (association) => {
      try {
        const { count } = await esClient.count({
          index: association.index,
          query: buildQuery('kql', association.query),
          expand_wildcards: ['open', 'hidden'],
          ignore_unavailable: true,
          allow_no_indices: true,
        });
        return { ...association, count };
      } catch (error) {
        return { ...association, error: errorMessage(error) };
      }
    })
  );
}
