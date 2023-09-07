/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @public
 *
 * CoreUsageStats are collected over time while Kibana is running. This is related to CoreUsageData, which is a superset of this that also
 * includes point-in-time configuration information.
 * */
export interface CoreUsageStats {
  // Saved Objects Client APIs
  'apiCalls.savedObjectsBulkCreate.total'?: number;
  'apiCalls.savedObjectsBulkCreate.namespace.default.total'?: number;
  'apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkCreate.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkCreate.namespace.custom.total'?: number;
  'apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkCreate.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkGet.total'?: number;
  'apiCalls.savedObjectsBulkGet.namespace.default.total'?: number;
  'apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkGet.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkGet.namespace.custom.total'?: number;
  'apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkGet.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkResolve.total'?: number;
  'apiCalls.savedObjectsBulkResolve.namespace.default.total'?: number;
  'apiCalls.savedObjectsBulkResolve.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkResolve.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkResolve.namespace.custom.total'?: number;
  'apiCalls.savedObjectsBulkResolve.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkResolve.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkUpdate.total'?: number;
  'apiCalls.savedObjectsBulkUpdate.namespace.default.total'?: number;
  'apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkUpdate.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkUpdate.namespace.custom.total'?: number;
  'apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkUpdate.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkDelete.total'?: number;
  'apiCalls.savedObjectsBulkDelete.namespace.default.total'?: number;
  'apiCalls.savedObjectsBulkDelete.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkDelete.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsBulkDelete.namespace.custom.total'?: number;
  'apiCalls.savedObjectsBulkDelete.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsBulkDelete.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsCreate.total'?: number;
  'apiCalls.savedObjectsCreate.namespace.default.total'?: number;
  'apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsCreate.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsCreate.namespace.custom.total'?: number;
  'apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsCreate.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsDelete.total'?: number;
  'apiCalls.savedObjectsDelete.namespace.default.total'?: number;
  'apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsDelete.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsDelete.namespace.custom.total'?: number;
  'apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsDelete.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsFind.total'?: number;
  'apiCalls.savedObjectsFind.namespace.default.total'?: number;
  'apiCalls.savedObjectsFind.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsFind.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsFind.namespace.custom.total'?: number;
  'apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsFind.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsGet.total'?: number;
  'apiCalls.savedObjectsGet.namespace.default.total'?: number;
  'apiCalls.savedObjectsGet.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsGet.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsGet.namespace.custom.total'?: number;
  'apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsGet.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsResolve.total'?: number;
  'apiCalls.savedObjectsResolve.namespace.default.total'?: number;
  'apiCalls.savedObjectsResolve.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsResolve.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsResolve.namespace.custom.total'?: number;
  'apiCalls.savedObjectsResolve.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsResolve.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsUpdate.total'?: number;
  'apiCalls.savedObjectsUpdate.namespace.default.total'?: number;
  'apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsUpdate.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsUpdate.namespace.custom.total'?: number;
  'apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsUpdate.namespace.custom.kibanaRequest.no'?: number;
  // Saved Objects Management APIs
  'apiCalls.savedObjectsImport.total'?: number;
  'apiCalls.savedObjectsImport.namespace.default.total'?: number;
  'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsImport.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsImport.namespace.custom.total'?: number;
  'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsImport.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsImport.createNewCopiesEnabled.yes'?: number;
  'apiCalls.savedObjectsImport.createNewCopiesEnabled.no'?: number;
  'apiCalls.savedObjectsImport.compatibilityModeEnabled.yes'?: number;
  'apiCalls.savedObjectsImport.compatibilityModeEnabled.no'?: number;
  'apiCalls.savedObjectsImport.overwriteEnabled.yes'?: number;
  'apiCalls.savedObjectsImport.overwriteEnabled.no'?: number;
  'apiCalls.savedObjectsResolveImportErrors.total'?: number;
  'apiCalls.savedObjectsResolveImportErrors.namespace.default.total'?: number;
  'apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsResolveImportErrors.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsResolveImportErrors.namespace.custom.total'?: number;
  'apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsResolveImportErrors.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.yes'?: number;
  'apiCalls.savedObjectsResolveImportErrors.createNewCopiesEnabled.no'?: number;
  'apiCalls.savedObjectsExport.total'?: number;
  'apiCalls.savedObjectsExport.namespace.default.total'?: number;
  'apiCalls.savedObjectsExport.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsExport.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsExport.namespace.custom.total'?: number;
  'apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.savedObjectsExport.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.savedObjectsExport.allTypesSelected.yes'?: number;
  'apiCalls.savedObjectsExport.allTypesSelected.no'?: number;
  // Legacy Dashboard Import/Export API
  'apiCalls.legacyDashboardExport.total'?: number;
  'apiCalls.legacyDashboardExport.namespace.default.total'?: number;
  'apiCalls.legacyDashboardExport.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.legacyDashboardExport.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.legacyDashboardExport.namespace.custom.total'?: number;
  'apiCalls.legacyDashboardExport.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.legacyDashboardExport.namespace.custom.kibanaRequest.no'?: number;
  'apiCalls.legacyDashboardImport.total'?: number;
  'apiCalls.legacyDashboardImport.namespace.default.total'?: number;
  'apiCalls.legacyDashboardImport.namespace.default.kibanaRequest.yes'?: number;
  'apiCalls.legacyDashboardImport.namespace.default.kibanaRequest.no'?: number;
  'apiCalls.legacyDashboardImport.namespace.custom.total'?: number;
  'apiCalls.legacyDashboardImport.namespace.custom.kibanaRequest.yes'?: number;
  'apiCalls.legacyDashboardImport.namespace.custom.kibanaRequest.no'?: number;
  // Saved Objects Repository counters
  'savedObjectsRepository.resolvedOutcome.exactMatch'?: number;
  'savedObjectsRepository.resolvedOutcome.aliasMatch'?: number;
  'savedObjectsRepository.resolvedOutcome.conflict'?: number;
  'savedObjectsRepository.resolvedOutcome.notFound'?: number;
  'savedObjectsRepository.resolvedOutcome.total'?: number;
}
