/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Single-toggle selection change emitted by the data source browser.
 *
 * The UI behaves like a list of options: each click adds/removes one item and
 * immediately applies the corresponding change in the editor.
 */
export enum DataSourceSelectionChange {
  Add = 'add',
  Remove = 'remove',
}
