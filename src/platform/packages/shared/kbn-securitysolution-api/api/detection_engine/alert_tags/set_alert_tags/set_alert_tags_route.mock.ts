/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SetAlertTagsRequestBody } from './set_alert_tags.gen';

export const getSetAlertTagsRequestMock = (
  tagsToAdd: string[] = [],
  tagsToRemove: string[] = [],
  ids: string[] = []
): SetAlertTagsRequestBody => ({
  tags: { tags_to_add: tagsToAdd, tags_to_remove: tagsToRemove },
  ids,
});
