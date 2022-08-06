/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * DataSetStatusType for an installed data set.
 * @see src/plugins/home/server/services/sample_data/lib/sample_dataset_registry_types
 */
export const INSTALLED_STATUS = 'installed';

/**
 * DataSetStatusType for a data set that is not installed yet.
 * @see src/plugins/home/server/services/sample_data/lib/sample_dataset_registry_types
 */
export const UNINSTALLED_STATUS = 'not_installed';

// Corresponds to src/plugins/home/server/services/sample_data/routes
export const SAMPLE_DATA_API = '/api/sample_data';
