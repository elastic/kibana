/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Trigger } from '@kbn/ui-actions-plugin/public';

export const EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID = 'EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID';

export const EDIT_LOOKUP_INDEX_CONTENT_TRIGGER: Trigger = {
  id: EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID,
  title: 'Edit Lookup Index',
  description: 'This trigger is used to edit the lookup index content.',
} as const;

export const ACTION_EDIT_LOOKUP_INDEX = 'ACTION_EDIT_LOOKUP_INDEX';
