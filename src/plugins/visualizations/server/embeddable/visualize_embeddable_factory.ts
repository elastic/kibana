/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { flow } from 'lodash';
import { EmbeddableRegistryDefinition } from 'src/plugins/embeddable/server';
import {
  commonAddSupportOfDualIndexSelectionModeInTSVB,
  commonHideTSVBLastValueIndicator,
  commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel,
} from '../migrations/visualization_common_migrations';

export const visualizeEmbeddableFactory = (): EmbeddableRegistryDefinition => {
  return {
    id: 'visualization',
    migrations: {
      // These migrations are run in 7.13.1 for `by value` panels because the 7.13 release window was missed.
      '7.13.1': (state) =>
        flow(
          commonAddSupportOfDualIndexSelectionModeInTSVB,
          commonHideTSVBLastValueIndicator,
          commonRemoveDefaultIndexPatternAndTimeFieldFromTSVBModel
        )(state),
    },
  };
};
