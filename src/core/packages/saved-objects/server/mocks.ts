/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { typeRegistryMock } from './src/base/saved_objects_type_registry.mock';
export { serializerMock } from './src/base/serialization/serializer.mock';
export { createDocumentMigratorMock } from './src/base/migration/document_migrator.mock';
export { mockKibanaMigrator } from './src/migration/kibana_migrator.mock';
export {
  migrationMocks,
  createSavedObjectsMigrationLoggerMock,
} from './src/migration/migration.mocks';
export { savedObjectsClientMock } from './src/api/saved_objects_client.mock';
export { savedObjectsRepositoryMock } from './src/api/lib/repository.mock';
export { savedObjectsClientProviderMock } from './src/api/lib/scoped_client_provider.mock';
export { savedObjectsExtensionsMock } from './src/extensions/saved_objects_extensions.mock';
export { savedObjectsServiceMock } from './src/service/saved_objects_service.mock';
export { savedObjectsImporterMock } from './src/import_export/import/saved_objects_importer.mock';
export { savedObjectsExporterMock } from './src/import_export/export/saved_objects_exporter.mock';
