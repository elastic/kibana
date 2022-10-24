/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';
import { omit, isEqual } from 'lodash';
import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from '../options_list/types';
import { RANGE_SLIDER_CONTROL } from '../range_slider/types';
import { TIME_SLIDER_CONTROL } from '../time_slider/types';

import { ControlGroupDiffSystem, ControlPanelState } from './types';

interface DiffSystem {
  getPanelIsEqual: (initialInput: ControlPanelState, newInput: ControlPanelState) => boolean;
}

const genericControlPanelDiffSystem: DiffSystem = {
  getPanelIsEqual: (initialInput, newInput) => {
    return deepEqual(initialInput, newInput);
  },
};

export const ControlPanelDiffSystems: {
  [key in ControlGroupDiffSystem]: DiffSystem;
} = {
  [OPTIONS_LIST_CONTROL]: {
    getPanelIsEqual: (initialInput, newInput) => {
      if (!deepEqual(omit(initialInput, 'explicitInput'), omit(newInput, 'explicitInput')))
        return false;

      const {
        exclude: excludeA,
        selectedOptions: selectedA,
        singleSelect: singleSelectA,
        allowExclude: allowExcludeA,
        runPastTimeout: runPastTimeoutA,
        ...inputA
      }: Partial<OptionsListEmbeddableInput> = initialInput.explicitInput;
      const {
        exclude: excludeB,
        selectedOptions: selectedB,
        singleSelect: singleSelectB,
        allowExclude: allowExcludeB,
        runPastTimeout: runPastTimeoutB,
        ...inputB
      }: Partial<OptionsListEmbeddableInput> = newInput.explicitInput;

      return (
        Boolean(excludeA) === Boolean(excludeB) &&
        Boolean(singleSelectA) === Boolean(singleSelectB) &&
        Boolean(allowExcludeA) === Boolean(allowExcludeB) &&
        Boolean(runPastTimeoutA) === Boolean(runPastTimeoutB) &&
        isEqual(selectedA ?? [], selectedB ?? []) &&
        deepEqual(inputA, inputB)
      );
    },
  },
  [RANGE_SLIDER_CONTROL]: genericControlPanelDiffSystem,
  [TIME_SLIDER_CONTROL]: genericControlPanelDiffSystem,
};
