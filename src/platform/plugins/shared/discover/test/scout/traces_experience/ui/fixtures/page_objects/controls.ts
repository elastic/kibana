/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, PageObjects } from '@kbn/scout';

const SLO_EVENT_CONTROL_ID = 'slo_event_control';

export interface TracesControls {
  readonly sloEventControl: Locator;
  getSloEventControlSelectedValue(value: string): Locator;
}

export function createTracesControls(discover: PageObjects['discover']): TracesControls {
  const sloEventControl = discover.controls.getControlFrame(SLO_EVENT_CONTROL_ID);

  return {
    sloEventControl,
    getSloEventControlSelectedValue: (value: string) =>
      discover.controls.getControlFrameSelectedValue(SLO_EVENT_CONTROL_ID, value),
  };
}
