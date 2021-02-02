/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// a temporary file to remove circular deps in TS code between platform & data plugin
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export { esKuery } from '../../../plugins/data/server';
