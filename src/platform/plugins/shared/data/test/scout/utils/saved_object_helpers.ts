/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';

export interface ImportedSavedObject {
  id: string;
  type: string;
  title: string;
}

export const findImportedSavedObjectId = (
  imported: ImportedSavedObject[],
  type: string,
  title: string
) => {
  const savedObject = imported.find((entry) => entry.type === type && entry.title === title);
  expect(
    savedObject,
    `Saved object "${title}" (${type}) not found in imported objects`
  ).toBeTruthy();
  return savedObject!.id;
};
