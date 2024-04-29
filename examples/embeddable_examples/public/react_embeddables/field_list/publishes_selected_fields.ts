/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '@kbn/presentation-publishing';

export interface PublishesSelectedFields {
  selectedFields: PublishingSubject<string[] | undefined>;
}

export const apiPublishesSelectedFields = (api: unknown): api is PublishesSelectedFields => {
  return Boolean(api && (api as PublishesSelectedFields)?.selectedFields !== undefined);
};
