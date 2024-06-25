/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type {
  IKibanaMigrator,
  SavedObjectsSerializer,
} from '@kbn/core-saved-objects-base-server-internal';
import type {
  ISavedObjectTypeRegistry,
  SavedObjectsExtensions,
} from '@kbn/core-saved-objects-server';
import {
  RepositoryHelpers,
  CommonHelper,
  EncryptionHelper,
  ValidationHelper,
  PreflightCheckHelper,
  SerializerHelper,
  MigrationHelper,
  UserHelper,
} from '../apis/helpers';
import type { RepositoryEsClient } from '../repository_es_client';
import { CreatePointInTimeFinderFn } from '../point_in_time_finder';

interface CreateRepositoryHelpersOptions {
  index: string;
  client: RepositoryEsClient;
  typeRegistry: ISavedObjectTypeRegistry;
  serializer: SavedObjectsSerializer;
  migrator: IKibanaMigrator;
  logger: Logger;
  extensions?: SavedObjectsExtensions;
  createPointInTimeFinder: CreatePointInTimeFinderFn;
}

export const createRepositoryHelpers = ({
  logger,
  extensions,
  index,
  client,
  typeRegistry,
  serializer,
  migrator,
  createPointInTimeFinder,
}: CreateRepositoryHelpersOptions): RepositoryHelpers => {
  const commonHelper = new CommonHelper({
    spaceExtension: extensions?.spacesExtension,
    encryptionExtension: extensions?.encryptionExtension,
    createPointInTimeFinder,
    defaultIndex: index,
    kibanaVersion: migrator.kibanaVersion,
    registry: typeRegistry,
  });
  const encryptionHelper = new EncryptionHelper({
    encryptionExtension: extensions?.encryptionExtension,
    securityExtension: extensions?.securityExtension,
  });
  const validationHelper = new ValidationHelper({
    registry: typeRegistry,
    logger,
    kibanaVersion: migrator.kibanaVersion,
  });
  const preflightCheckHelper = new PreflightCheckHelper({
    getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
    createPointInTimeFinder: commonHelper.createPointInTimeFinder.bind(commonHelper),
    serializer,
    registry: typeRegistry,
    client,
  });
  const serializerHelper = new SerializerHelper({
    registry: typeRegistry,
    serializer,
  });
  const migrationHelper = new MigrationHelper({
    migrator,
    encryptionHelper,
  });
  const userHelper = new UserHelper({
    securityExtension: extensions?.securityExtension,
  });

  const helpers: RepositoryHelpers = {
    common: commonHelper,
    preflight: preflightCheckHelper,
    validation: validationHelper,
    encryption: encryptionHelper,
    serializer: serializerHelper,
    migration: migrationHelper,
    user: userHelper,
  };

  return helpers;
};
