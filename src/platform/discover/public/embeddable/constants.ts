/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Trigger } from '@kbn/ui-actions-plugin/public';

export { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';

export const SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID =
  'SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID';

export const SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER: Trigger = {
  id: SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID,
  title: 'Discover saved searches embeddable cell actions',
  description:
    'This trigger is used to replace the cell actions for Discover saved search embeddable grid.',
} as const;
