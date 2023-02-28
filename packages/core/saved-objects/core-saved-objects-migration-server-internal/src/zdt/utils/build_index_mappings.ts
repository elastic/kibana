/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  type IndexMapping,
  type IndexMappingMeta,
  getModelVersionMapForTypes,
} from '@kbn/core-saved-objects-base-server-internal';
import { getBaseMappings, buildTypesMappings } from '../../core';

interface BuildIndexMappingsOpts {
  types: SavedObjectsType[];
}

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

export const buildIndexMeta = ({ types }: BuildIndexMetaOpts): IndexMappingMeta => {
  const modelVersions = getModelVersionMapForTypes(types);

  return {
    mappingVersions: modelVersions,
    docVersions: modelVersions,
  };
};
