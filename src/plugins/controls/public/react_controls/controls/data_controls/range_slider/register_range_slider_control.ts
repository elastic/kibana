/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ControlsPluginStartDeps } from '../../../../types';
import { registerControlFactory } from '../../../control_factory_registry';
import { RANGE_SLIDER_CONTROL } from '../../../../../common';

export function registerRangeSliderControl(coreSetup: CoreSetup<ControlsPluginStartDeps>) {
  registerControlFactory(RANGE_SLIDER_CONTROL, async () => {
    const [{ getRangesliderControlFactory }, [coreStart, depsStart]] = await Promise.all([
      import('./get_range_slider_control_factory'),
      coreSetup.getStartServices(),
    ]);

    return getRangesliderControlFactory({
      core: coreStart,
      data: depsStart.data,
      dataViews: depsStart.data.dataViews,
    });
  });
}
