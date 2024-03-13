/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';
import { omit, isEqual } from 'lodash';
import { OPTIONS_LIST_DEFAULT_SORT } from '../options_list/suggestions_sorting';
import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from '../options_list/types';
import { RangeSliderEmbeddableInput, RANGE_SLIDER_CONTROL } from '../range_slider/types';
import { TimeSliderControlEmbeddableInput, TIME_SLIDER_CONTROL } from '../time_slider/types';

import { ControlPanelState } from './types';

interface DiffSystem {
  getPanelIsEqual: (
    initialInput: ControlPanelState,
    newInput: ControlPanelState,
    compareSelections?: boolean
  ) => boolean;
}

export const genericControlPanelDiffSystem: DiffSystem = {
  getPanelIsEqual: (initialInput, newInput) => {
    return deepEqual(initialInput, newInput);
  },
};

export const ControlPanelDiffSystems: {
  [key: string]: DiffSystem;
} = {
  [RANGE_SLIDER_CONTROL]: {
    getPanelIsEqual: (initialInput, newInput, compareSelections) => {
      if (!deepEqual(omit(initialInput, 'explicitInput'), omit(newInput, 'explicitInput'))) {
        return false;
      }

      const { value: valueA = ['', ''], ...inputA }: Partial<RangeSliderEmbeddableInput> =
        initialInput.explicitInput;
      const { value: valueB = ['', ''], ...inputB }: Partial<RangeSliderEmbeddableInput> =
        newInput.explicitInput;
      return (compareSelections ? isEqual(valueA, valueB) : true) && deepEqual(inputA, inputB);
    },
  },
  [OPTIONS_LIST_CONTROL]: {
    getPanelIsEqual: (initialInput, newInput, compareSelections) => {
      if (!deepEqual(omit(initialInput, 'explicitInput'), omit(newInput, 'explicitInput'))) {
        return false;
      }

      const {
        sort: sortA,
        exclude: excludeA,
        hideSort: hideSortA,
        hideExists: hideExistsA,
        hideExclude: hideExcludeA,
        selectedOptions: selectedA,
        singleSelect: singleSelectA,
        searchTechnique: searchTechniqueA,
        existsSelected: existsSelectedA,
        runPastTimeout: runPastTimeoutA,
        ...inputA
      }: Partial<OptionsListEmbeddableInput> = initialInput.explicitInput;
      const {
        sort: sortB,
        exclude: excludeB,
        hideSort: hideSortB,
        hideExists: hideExistsB,
        hideExclude: hideExcludeB,
        selectedOptions: selectedB,
        singleSelect: singleSelectB,
        searchTechnique: searchTechniqueB,
        existsSelected: existsSelectedB,
        runPastTimeout: runPastTimeoutB,
        ...inputB
      }: Partial<OptionsListEmbeddableInput> = newInput.explicitInput;

      return (
        Boolean(hideSortA) === Boolean(hideSortB) &&
        Boolean(hideExistsA) === Boolean(hideExistsB) &&
        Boolean(hideExcludeA) === Boolean(hideExcludeB) &&
        Boolean(singleSelectA) === Boolean(singleSelectB) &&
        Boolean(runPastTimeoutA) === Boolean(runPastTimeoutB) &&
        isEqual(searchTechniqueA ?? 'prefix', searchTechniqueB ?? 'prefix') &&
        deepEqual(sortA ?? OPTIONS_LIST_DEFAULT_SORT, sortB ?? OPTIONS_LIST_DEFAULT_SORT) &&
        (compareSelections
          ? Boolean(excludeA) === Boolean(excludeB) &&
            Boolean(existsSelectedA) === Boolean(existsSelectedB) &&
            isEqual(selectedA ?? [], selectedB ?? [])
          : true) &&
        deepEqual(inputA, inputB)
      );
    },
  },
  [TIME_SLIDER_CONTROL]: {
    getPanelIsEqual: (initialInput, newInput, compareSelections) => {
      if (!deepEqual(omit(initialInput, 'explicitInput'), omit(newInput, 'explicitInput'))) {
        return false;
      }

      const {
        isAnchored: isAnchoredA,
        timesliceStartAsPercentageOfTimeRange: startA,
        timesliceEndAsPercentageOfTimeRange: endA,
      }: Partial<TimeSliderControlEmbeddableInput> = initialInput.explicitInput;
      const {
        isAnchored: isAnchoredB,
        timesliceStartAsPercentageOfTimeRange: startB,
        timesliceEndAsPercentageOfTimeRange: endB,
      }: Partial<TimeSliderControlEmbeddableInput> = newInput.explicitInput;
      return (
        Boolean(isAnchoredA) === Boolean(isAnchoredB) &&
        (compareSelections
          ? Boolean(startA) === Boolean(startB) &&
            startA === startB &&
            Boolean(endA) === Boolean(endB) &&
            endA === endB
          : true)
      );
    },
  },
};
