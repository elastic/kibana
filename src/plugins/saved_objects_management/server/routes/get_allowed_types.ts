/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, SavedObjectsType } from '@kbn/core/server';
import type { CapabilitiesStart } from '@kbn/core-capabilities-server/src/contracts';
import type { SavedObjectManagementTypeInfo } from '../../common';

const convertType = (sot: SavedObjectsType): SavedObjectManagementTypeInfo => {
  return {
    name: sot.name,
    namespaceType: sot.namespaceType,
    hidden: sot.hidden,
    displayName: sot.management?.displayName ?? sot.name,
  };
};

export const registerGetAllowedTypesRoute = (
  router: IRouter,
  capabilitiesPromise?: Promise<CapabilitiesStart>
) => {
  router.get(
    {
      path: '/api/kibana/management/saved_objects/_allowed_types',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: false,
    },
    async (context, req, res) => {
      const allowedTypes = (await context.core).savedObjects.typeRegistry
        .getImportableAndExportableTypes()
        .filter((type) => type.management!.visibleInManagement ?? true)
        .map(convertType);

      if (capabilitiesPromise) {
        // Check if the user has the capability to see ML objects
        // if so, add it to the allowed types
        // ML objects are not importable and exportable within management page
        // as they are just wrappers around Elasticsearch objects
        const capabilities = await capabilitiesPromise;
        const mlCapabilities = await capabilities.resolveCapabilities(req, {
          capabilityPath: 'ml.*',
        });
        const canSeeMLJobs =
          mlCapabilities.ml.canGetJobs && mlCapabilities.ml.canGetDataFrameAnalytics;
        const canSeeTrainedModels = mlCapabilities.ml.canGetTrainedModels;

        const [mlJobType, trainedModelType] = await Promise.all([
          canSeeMLJobs ? (await context.core).savedObjects.typeRegistry.getType('ml-job') : null,
          canSeeTrainedModels
            ? (await context.core).savedObjects.typeRegistry.getType('ml-trained-model')
            : null,
        ]);

        if (mlJobType) {
          allowedTypes.push(convertType(mlJobType));
        }
        if (trainedModelType) {
          allowedTypes.push(convertType(trainedModelType));
        }
      }

      return res.ok({
        body: {
          types: allowedTypes,
        },
      });
    }
  );
};
