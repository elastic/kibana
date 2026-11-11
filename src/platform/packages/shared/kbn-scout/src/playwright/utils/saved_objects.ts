/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface ImportedSavedObject {
  readonly id: string;
  readonly type: string;
  readonly title: string;
}

/** Finds an imported saved object's destination ID by type and title. */
export const findImportedSavedObjectId = (
  imported: ReadonlyArray<ImportedSavedObject>,
  type: string,
  title: string
): string => {
  const savedObject = imported.find((item) => item.type === type && item.title === title);
  if (!savedObject) {
    throw new Error(`Missing imported saved object: ${type} "${title}"`);
  }

  return savedObject.id;
};
