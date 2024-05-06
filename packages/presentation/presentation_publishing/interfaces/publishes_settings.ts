/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '../publishing_subject';

/**
 * This API publishes a saved object id which can be used to determine which saved object this API is linked to.
 */

interface Settings {
  syncColors$: PublishingSubject<boolean>;
  syncCursor$: PublishingSubject<boolean>;
  syncTooltips$: PublishingSubject<boolean>;
}

export interface PublishesSettings {
  settings: Settings;
}

export const apiPublishesSettings = (
  unknownApi: null | unknown
): unknownApi is PublishesSettings => {
  const api = unknownApi as PublishesSettings;
  return Boolean(
    api &&
      api.settings !== undefined &&
      api.settings.syncColors$ !== undefined &&
      api.settings.syncCursor$ !== undefined &&
      api.settings.syncTooltips$ !== undefined
  );
};
