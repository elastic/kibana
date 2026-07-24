/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The data view editor flyout and the data views management page are both driven
// through core `@kbn/scout` page objects (`dataViewEditor` / `dataViewsManagement`),
// so no plugin-local page objects are needed here.
export { test } from '@kbn/scout';

export { CUSTOM_ROLES } from './custom_roles';
