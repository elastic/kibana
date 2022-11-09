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

import { ControlPanelState } from './types';

interface DiffSystem {
  getPanelIsEqual: (initialInput: ControlPanelState, newInput: ControlPanelState) => boolean;
}

export const genericControlPanelDiffSystem: DiffSystem = {
  getPanelIsEqual: (initialInput, newInput) => {
    return deepEqual(initialInput, newInput);
  },
};

export const ControlPanelDiffSystems: {
  [key: string]: DiffSystem;
} = {
  [OPTIONS_LIST_CONTROL]: {
    getPanelIsEqual: (initialInput, newInput) => {
      if (!deepEqual(omit(initialInput, 'explicitInput'), omit(newInput, 'explicitInput'))) {
        return false;
      }

      const {
        exclude: excludeA,
        hideExists: hideExistsA,
        hideExclude: hideExcludeA,
        selectedOptions: selectedA,
        singleSelect: singleSelectA,
        existsSelected: existsSelectedA,
        runPastTimeout: runPastTimeoutA,
        ...inputA
      }: Partial<OptionsListEmbeddableInput> = initialInput.explicitInput;
      const {
        exclude: excludeB,
        hideExists: hideExistsB,
        hideExclude: hideExcludeB,
        selectedOptions: selectedB,
        singleSelect: singleSelectB,
        existsSelected: existsSelectedB,
        runPastTimeout: runPastTimeoutB,
        ...inputB
      }: Partial<OptionsListEmbeddableInput> = newInput.explicitInput;

      return (
        Boolean(excludeA) === Boolean(excludeB) &&
        Boolean(hideExistsA) === Boolean(hideExistsB) &&
        Boolean(hideExcludeA) === Boolean(hideExcludeB) &&
        Boolean(singleSelectA) === Boolean(singleSelectB) &&
        Boolean(existsSelectedA) === Boolean(existsSelectedB) &&
        Boolean(runPastTimeoutA) === Boolean(runPastTimeoutB) &&
        isEqual(selectedA ?? [], selectedB ?? []) &&
        deepEqual(inputA, inputB)
      );
    },
  },
};
