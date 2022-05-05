/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VALUE_CLICK_TRIGGER } from '@kbn/embeddable-plugin/public';

export interface VisEventToTrigger {
  ['filter']: typeof VALUE_CLICK_TRIGGER;
}

export const VIS_EVENT_TO_TRIGGER: VisEventToTrigger = {
  filter: VALUE_CLICK_TRIGGER,
};
