/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export * from './service';

export * from './import';

export {
  exportSavedObjectsToStream,
  SavedObjectsExportOptions,
  SavedObjectsExportResultDetails,
} from './export';

export {
  SavedObjectsSerializer,
  SavedObjectsRawDoc,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from './serialization';

export { SavedObjectsMigrationLogger } from './migrations/core/migration_logger';

export {
  SavedObjectsService,
  InternalSavedObjectsServiceStart,
  SavedObjectsServiceStart,
  SavedObjectsServiceSetup,
  InternalSavedObjectsServiceSetup,
  SavedObjectsRepositoryFactory,
} from './saved_objects_service';

export {
  ISavedObjectsRepository,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsDeleteByNamespaceOptions,
} from './service/lib/repository';

export {
  SavedObjectsCoreFieldMapping,
  SavedObjectsComplexFieldMapping,
  SavedObjectsFieldMapping,
  SavedObjectsMappingProperties,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsTypeMappingDefinitions,
} from './mappings';

export {
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from './migrations';

export {
  SavedObjectsNamespaceType,
  SavedObjectStatusMeta,
  SavedObjectsType,
  SavedObjectsTypeManagementDefinition,
} from './types';

export { savedObjectsConfig, savedObjectsMigrationConfig } from './saved_objects_config';
export { SavedObjectTypeRegistry, ISavedObjectTypeRegistry } from './saved_objects_type_registry';
