/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  type IndexMapping,
  type IndexMappingMeta,
  getVirtualVersionMap,
} from '@kbn/core-saved-objects-base-server-internal';
import { getBaseMappings, buildTypesMappings } from '../../core';

interface BuildIndexMappingsOpts {
  types: SavedObjectsType[];
}

/**
 * Build the mappings to use when creating a new index.
 *
 * @param types The list of all registered SO types.
 */
export const buildIndexMappings = ({ types }: BuildIndexMappingsOpts): IndexMapping => {
  const mappings: IndexMapping = cloneDeep(getBaseMappings());
  const typeMappings = buildTypesMappings(types);

  mappings.properties = {
    ...mappings.properties,
    ...typeMappings,
  };

  mappings._meta = buildIndexMeta({ types });

  return mappings;
};

interface BuildIndexMetaOpts {
  types: SavedObjectsType[];
}

/**
 * Build the mapping _meta field to use when creating a new index.
 *
 * @param types The list of all registered SO types.
 */
export const buildIndexMeta = ({ types }: BuildIndexMetaOpts): IndexMappingMeta => {
  const typeVersions = getVirtualVersionMap(types);

  return {
    mappingVersions: typeVersions,
    docVersions: typeVersions,
    migrationState: {
      convertingDocuments: false,
    },
  };
};
