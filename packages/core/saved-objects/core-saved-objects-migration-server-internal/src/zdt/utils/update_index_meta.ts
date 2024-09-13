/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IndexMappingMeta,
  VirtualVersionMap,
} from '@kbn/core-saved-objects-base-server-internal';

export const setMetaMappingMigrationComplete = ({
  meta,
  versions,
}: {
  meta: IndexMappingMeta;
  versions: VirtualVersionMap;
}): IndexMappingMeta => {
  return {
    ...meta,
    mappingVersions: {
      ...versions,
    },
  };
};

export const setMetaDocMigrationStarted = ({
  meta,
}: {
  meta: IndexMappingMeta;
}): IndexMappingMeta => {
  return {
    ...meta,
    migrationState: {
      convertingDocuments: true,
    },
  };
};

export const setMetaDocMigrationComplete = ({
  meta,
  versions,
}: {
  meta: IndexMappingMeta;
  versions: VirtualVersionMap;
}): IndexMappingMeta => {
  return {
    ...meta,
    docVersions: {
      ...versions,
    },
    migrationState: {
      convertingDocuments: false,
    },
  };
};

export const removePropertiesFromV2 = (meta: IndexMappingMeta): IndexMappingMeta => {
  const cleaned = { ...meta };
  delete cleaned.indexTypesMap;
  delete cleaned.migrationMappingPropertyHashes;
  return cleaned;
};
