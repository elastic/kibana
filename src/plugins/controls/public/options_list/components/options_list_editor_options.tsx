/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import { Direction, EuiFormRow, EuiLoadingSpinner, EuiRadioGroup, EuiSwitch } from '@elastic/eui';

import {
  getCompatibleSearchTechniques,
  OptionsListSearchTechnique,
} from '../../../common/options_list/suggestions_searching';
import {
  getCompatibleSortingTypes,
  OptionsListSortBy,
  OPTIONS_LIST_DEFAULT_SORT,
} from '../../../common/options_list/suggestions_sorting';
import { pluginServices } from '../../services';
import { OptionsListStrings } from './options_list_strings';
import { ControlSettingTooltipLabel } from '../../components/control_setting_tooltip_label';
import { OptionsListEmbeddableInput } from '..';
import { ControlEditorProps } from '../../types';

const selectionOptions = [
  {
    id: 'multi',
    label: OptionsListStrings.editor.selectionTypes.multi.getLabel(),
    'data-test-subj': 'optionsListControl__multiSearchOptionAdditionalSetting',
  },
  {
    id: 'single',
    label: OptionsListStrings.editor.selectionTypes.single.getLabel(),
    'data-test-subj': 'optionsListControl__singleSearchOptionAdditionalSetting',
  },
];

const allSearchOptions = [
  {
    id: 'prefix',
    label: (
      <ControlSettingTooltipLabel
        label={OptionsListStrings.editor.searchTypes.prefix.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.prefix.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__prefixSearchOptionAdditionalSetting',
  },
  {
    id: 'wildcard',
    label: (
      <ControlSettingTooltipLabel
        label={OptionsListStrings.editor.searchTypes.wildcard.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.wildcard.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__wildcardSearchOptionAdditionalSetting',
  },
  {
    id: 'exact',
    label: (
      <ControlSettingTooltipLabel
        label={OptionsListStrings.editor.searchTypes.exact.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.exact.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__exactSearchOptionAdditionalSetting',
  },
];

interface OptionsListEditorState {
  sortDirection: Direction;
  runPastTimeout?: boolean;
  searchTechnique?: OptionsListSearchTechnique;
  singleSelect?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
  sortBy: OptionsListSortBy;
}

export const OptionsListEditorOptions = ({
  initialInput,
  onChange,
  fieldType,
}: ControlEditorProps<OptionsListEmbeddableInput>) => {
  const [state, setState] = useState<OptionsListEditorState>({
    sortDirection: initialInput?.sort?.direction ?? OPTIONS_LIST_DEFAULT_SORT.direction,
    sortBy: initialInput?.sort?.by ?? OPTIONS_LIST_DEFAULT_SORT.by,
    searchTechnique: initialInput?.searchTechnique,
    runPastTimeout: initialInput?.runPastTimeout,
    singleSelect: initialInput?.singleSelect,
    hideExclude: initialInput?.hideExclude,
    hideExists: initialInput?.hideExists,
    hideSort: initialInput?.hideSort,
  });

  const { loading: waitingForAllowExpensiveQueries, value: allowExpensiveQueries } =
    useAsync(async () => {
      const { optionsList: optionsListService } = pluginServices.getServices();
      return optionsListService.getAllowExpensiveQueries();
    }, []);

  const compatibleSearchTechniques = useMemo(
    () => getCompatibleSearchTechniques(fieldType),
    [fieldType]
  );

  const searchOptions = useMemo(() => {
    return allSearchOptions.filter((searchOption) => {
      return compatibleSearchTechniques.includes(searchOption.id as OptionsListSearchTechnique);
    });
  }, [compatibleSearchTechniques]);

  useEffect(() => {
    // when field type changes, ensure that the selected sort type is still valid
    if (!getCompatibleSortingTypes(fieldType).includes(state.sortBy)) {
      onChange({ sort: OPTIONS_LIST_DEFAULT_SORT });
      setState((s) => ({
        ...s,
        sortBy: OPTIONS_LIST_DEFAULT_SORT.by,
        sortDirection: OPTIONS_LIST_DEFAULT_SORT.direction,
      }));
    }
  }, [fieldType, onChange, state.sortBy]);

  useEffect(() => {
    // when field type changes, ensure that the selected search technique is still valid;
    // if the selected search technique **isn't** valid, reset to the default
    const searchTechnique =
      initialInput?.searchTechnique &&
      compatibleSearchTechniques.includes(initialInput.searchTechnique)
        ? initialInput.searchTechnique
        : compatibleSearchTechniques[0];
    onChange({ searchTechnique });
    setState((s) => ({
      ...s,
      searchTechnique,
    }));
  }, [compatibleSearchTechniques, onChange, initialInput]);

  return (
    <>
      <EuiFormRow
        label={OptionsListStrings.editor.getSelectionOptionsTitle()}
        data-test-subj="optionsListControl__selectionOptionsRadioGroup"
      >
        <EuiRadioGroup
          options={selectionOptions}
          idSelected={state.singleSelect ? 'single' : 'multi'}
          onChange={(id) => {
            const newSingleSelect = id === 'single';
            onChange({ singleSelect: newSingleSelect });
            setState((s) => ({ ...s, singleSelect: newSingleSelect }));
          }}
        />
      </EuiFormRow>
      {waitingForAllowExpensiveQueries ? (
        <EuiFormRow>
          <EuiLoadingSpinner size="l" />
        </EuiFormRow>
      ) : (
        allowExpensiveQueries &&
        compatibleSearchTechniques.length > 1 && (
          <EuiFormRow
            label={OptionsListStrings.editor.getSearchOptionsTitle()}
            data-test-subj="optionsListControl__searchOptionsRadioGroup"
          >
            <EuiRadioGroup
              options={searchOptions}
              idSelected={state.searchTechnique}
              onChange={(id) => {
                const searchTechnique = id as OptionsListSearchTechnique;
                onChange({ searchTechnique });
                setState((s) => ({ ...s, searchTechnique }));
              }}
            />
          </EuiFormRow>
        )
      )}
      <EuiFormRow label={OptionsListStrings.editor.getAdditionalSettingsTitle()}>
        <EuiSwitch
          label={
            <ControlSettingTooltipLabel
              label={OptionsListStrings.editor.getRunPastTimeoutTitle()}
              tooltip={OptionsListStrings.editor.getRunPastTimeoutTooltip()}
            />
          }
          checked={Boolean(state.runPastTimeout)}
          onChange={() => {
            onChange({ runPastTimeout: !state.runPastTimeout });
            setState((s) => ({ ...s, runPastTimeout: !s.runPastTimeout }));
          }}
          data-test-subj={'optionsListControl__runPastTimeoutAdditionalSetting'}
        />
      </EuiFormRow>
    </>
  );
};
