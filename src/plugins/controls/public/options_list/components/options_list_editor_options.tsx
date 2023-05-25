/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  Direction,
  EuiRadioGroup,
} from '@elastic/eui';
import { css } from '@emotion/react';

import {
  getCompatibleSortingTypes,
  OPTIONS_LIST_DEFAULT_SORT,
  OptionsListSortBy,
} from '../../../common/options_list/suggestions_sorting';
import { OptionsListStrings } from './options_list_strings';
import { ControlEditorProps, OptionsListEmbeddableInput } from '../..';

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

interface OptionsListEditorState {
  sortDirection: Direction;
  runPastTimeout?: boolean;
  wildcardSearch?: boolean;
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
    runPastTimeout: initialInput?.runPastTimeout,
    wildcardSearch: initialInput?.wildcardSearch,
    singleSelect: initialInput?.singleSelect,
    hideExclude: initialInput?.hideExclude,
    hideExists: initialInput?.hideExists,
    hideSort: initialInput?.hideSort,
  });

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

  const selectionOptions = useMemo(() => {
    return Object.keys(OptionsListStrings.editor.selectionTypes).map((type: string) => {
      return {
        id: type,
        label:
          OptionsListStrings.editor.selectionTypes[
            type as keyof typeof OptionsListStrings.editor.selectionTypes
          ].getLabel(),
      };
    });
  }, []);

  const searchOptions = useMemo(() => {
    return Object.keys(OptionsListStrings.editor.searchTypes).map((type: string) => {
      const searchOptionStrings =
        OptionsListStrings.editor.searchTypes[
          type as keyof typeof OptionsListStrings.editor.searchTypes
        ];

      return {
        id: type,
        label: (
          <TooltipText
            label={searchOptionStrings.getLabel()}
            tooltip={searchOptionStrings.getTooltip()}
          />
        ),
      };
    });
  }, []);

  return (
    <>
      <EuiFormRow label={OptionsListStrings.editor.getSelectionOptionsTitle()}>
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
      <EuiFormRow label={'Searching'}>
        <EuiRadioGroup
          options={searchOptions}
          idSelected={state.wildcardSearch ? 'contains' : 'prefix'}
          onChange={(id) => {
            const newWildcardSearch = id === 'contains';
            onChange({ wildcardSearch: newWildcardSearch });
            setState((s) => ({ ...s, wildcardSearch: newWildcardSearch }));
          }}
        />
      </EuiFormRow>
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
