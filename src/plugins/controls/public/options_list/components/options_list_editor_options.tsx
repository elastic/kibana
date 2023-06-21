/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useAsync from 'react-use/lib/useAsync';
import React, { useEffect, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  Direction,
  EuiRadioGroup,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { pluginServices } from '../../services';
import {
  OptionsListSortBy,
  getCompatibleSortingTypes,
  OPTIONS_LIST_DEFAULT_SORT,
} from '../../../common/options_list/suggestions_sorting';
import { OptionsListStrings } from './options_list_strings';
import { ControlEditorProps, OptionsListEmbeddableInput } from '../..';
import {
  OptionsListSearchTechnique,
  OPTIONS_LIST_DEFAULT_SEARCH_TECHNIQUE,
} from '../../../common/options_list/types';

const TooltipText = ({ label, tooltip }: { label: string; tooltip: string }) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem
      grow={false}
      css={css`
        margin-top: 0px !important;
      `}
    >
      <EuiIconTip content={tooltip} position="right" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

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

const searchOptions = [
  {
    id: 'prefix',
    label: (
      <TooltipText
        label={OptionsListStrings.editor.searchTypes.prefix.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.prefix.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__prefixSearchOptionAdditionalSetting',
  },
  {
    id: 'wildcard',
    label: (
      <TooltipText
        label={OptionsListStrings.editor.searchTypes.wildcard.getLabel()}
        tooltip={OptionsListStrings.editor.searchTypes.wildcard.getTooltip()}
      />
    ),
    'data-test-subj': 'optionsListControl__wildcardSearchOptionAdditionalSetting',
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
        fieldType !== 'ip' && (
          <EuiFormRow
            label={OptionsListStrings.editor.getSearchOptionsTitle()}
            data-test-subj="optionsListControl__searchOptionsRadioGroup"
          >
            <EuiRadioGroup
              options={searchOptions}
              idSelected={state.searchTechnique ?? OPTIONS_LIST_DEFAULT_SEARCH_TECHNIQUE}
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
            <TooltipText
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
