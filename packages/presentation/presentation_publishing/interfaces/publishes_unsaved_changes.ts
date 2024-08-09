/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '../publishing_subject';

export interface PublishesUnsavedChanges<Runtime extends object = object> {
  unsavedChanges: PublishingSubject<Partial<Runtime> | undefined>;
  resetUnsavedChanges: () => void;
}

export const apiPublishesUnsavedChanges = (api: unknown): api is PublishesUnsavedChanges => {
  return Boolean(
    api &&
      (api as PublishesUnsavedChanges).unsavedChanges &&
      (api as PublishesUnsavedChanges).resetUnsavedChanges
  );
};
