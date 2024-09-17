/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import { TIME_SLIDER_CONTROL } from '../../../../common';
import type { ControlsPluginStartDeps } from '../../../types';
import { registerControlFactory } from '../../control_factory_registry';

export function registerTimeSliderControl(coreSetup: CoreSetup<ControlsPluginStartDeps>) {
  registerControlFactory(TIME_SLIDER_CONTROL, async () => {
    const [{ getTimesliderControlFactory }, [coreStart, depsStart]] = await Promise.all([
      import('./get_timeslider_control_factory'),
      coreSetup.getStartServices(),
    ]);
    return getTimesliderControlFactory();
  });
}
