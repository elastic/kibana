/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIME_SLIDER_CONTROL } from '../../../../common';
import { untilPluginStartServicesReady } from '../../../services/kibana_services';
import { registerControlFactory } from '../../control_factory_registry';

export function registerTimeSliderControl() {
  registerControlFactory(TIME_SLIDER_CONTROL, async () => {
    const [{ getTimesliderControlFactory }] = await Promise.all([
      import('./get_timeslider_control_factory'),
      untilPluginStartServicesReady(),
    ]);
    return getTimesliderControlFactory();
  });
}
