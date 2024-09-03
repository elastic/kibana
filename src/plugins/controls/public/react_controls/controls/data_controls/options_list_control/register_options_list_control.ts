/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { ControlsPluginStartDeps } from '../../../../types';
import { registerControlFactory } from '../../../control_factory_registry';
import { OPTIONS_LIST_CONTROL } from '../../../../../common';

export function registerOptionsListControl(coreSetup: CoreSetup<ControlsPluginStartDeps>) {
  registerControlFactory(OPTIONS_LIST_CONTROL, async () => {
    const [{ getOptionsListControlFactory }, [coreStart, depsStart]] = await Promise.all([
      import('./get_options_list_control_factory'),
      coreSetup.getStartServices(),
    ]);
    return getOptionsListControlFactory({
      core: coreStart,
      data: depsStart.data,
      dataViews: depsStart.data.dataViews,
    });
  });
}
