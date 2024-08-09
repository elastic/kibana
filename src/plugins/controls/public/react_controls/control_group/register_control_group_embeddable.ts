/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core/public';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { ControlsPluginStartDeps } from '../../types';
import { CONTROL_GROUP_TYPE } from '../../../common';

export function registerControlGroupEmbeddable(
  coreSetup: CoreSetup<ControlsPluginStartDeps>,
  embeddableSetup: EmbeddableSetup
) {
  embeddableSetup.registerReactEmbeddableFactory(CONTROL_GROUP_TYPE, async () => {
    const [{ getControlGroupEmbeddableFactory }, [coreStart, depsStart]] = await Promise.all([
      import('./get_control_group_factory'),
      coreSetup.getStartServices(),
    ]);
    return getControlGroupEmbeddableFactory({
      core: coreStart,
      dataViews: depsStart.data.dataViews,
    });
  });
}
