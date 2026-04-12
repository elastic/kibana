/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { typeRegistryMock } from './src/base/mocks/saved_objects_type_registry.mock';
export { serializerMock } from './src/base/mocks/serializer.mock';
export { createDocumentMigratorMock } from './src/base/mocks/document_migrator.mock';
export { mockKibanaMigrator } from './src/migration/mocks/kibana_migrator.mock';
export {
  migrationMocks,
  createSavedObjectsMigrationLoggerMock,
} from './src/migration/mocks/migration.mocks';
export { retryAsync } from './src/migration/mocks/helpers/retry_async';
export { savedObjectsClientMock } from './src/api/mocks/saved_objects_client.mock';
export { savedObjectsRepositoryMock } from './src/api/mocks/repository.mock';
export { savedObjectsClientProviderMock } from './src/api/mocks/scoped_client_provider.mock';
export { savedObjectsExtensionsMock } from './src/api/mocks/saved_objects_extensions.mock';
export { savedObjectsServiceMock } from './src/service/mocks/saved_objects_service.mock';
export { savedObjectsImporterMock } from './src/import_export/mocks/saved_objects_importer.mock';
export { savedObjectsExporterMock } from './src/import_export/mocks/saved_objects_exporter.mock';
