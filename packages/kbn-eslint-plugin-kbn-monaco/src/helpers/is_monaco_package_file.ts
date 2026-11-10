/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Whether the file belongs to `@kbn/monaco` or `@kbn/code-editor`, the two packages that own the
 * Monaco boundary. Rules that guard that boundary do not apply to the packages that implement it.
 */
export const isMonacoPackageFile = (filename: string): boolean => {
  const path = filename.replace(/\\/g, '/');

  return (
    path.includes('/kbn-monaco/') ||
    // code_editor/impl is the @kbn/code-editor package directory
    (path.includes('/code_editor/impl/') && !path.includes('/node_modules/'))
  );
};
