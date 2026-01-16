/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type {
  RangeSliderControlState,
  StoredRangeSliderExplicitInput,
} from '@kbn/controls-schemas';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { transformDataControlOut, transformDataControlIn } from './data_control_transforms';

const RANGE_SLIDER_REF_NAME = 'rangeSliderDataView' as const;
const RANGE_SLIDER_LEGACY_REF_NAMES = [
  'rangeSliderDataView',
  'rangeSliderControlDataView',
] as const;

export const registerRangeSliderControlTransforms = (embeddable: EmbeddableSetup) => {
  embeddable.registerTransforms(RANGE_SLIDER_CONTROL, {
    transformIn: (state: RangeSliderControlState) => {
      const { state: dataControlState, references } = transformDataControlIn(
        state,
        RANGE_SLIDER_REF_NAME
      );
      return {
        state: {
          ...dataControlState,
          value: state.value,
          step: state.step,
        } as StoredRangeSliderExplicitInput,
        references,
      };
    },
    transformOut: (
      state: StoredRangeSliderExplicitInput,
      panelReferences,
      containerReferences,
      id
    ): RangeSliderControlState => {
      const dataControlState = transformDataControlOut(
        id,
        state,
        RANGE_SLIDER_LEGACY_REF_NAMES,
        panelReferences,
        containerReferences
      );
      return {
        ...dataControlState,
        value: state.value,
        step: state.step,
      };
    },
  });
};
