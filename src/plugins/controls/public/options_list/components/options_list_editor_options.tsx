/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  Direction,
} from '@elastic/eui';
import { css } from '@emotion/react';

import {
  getCompatibleSortingTypes,
  OPTIONS_LIST_DEFAULT_SORT,
  OptionsListSortBy,
} from '../../../common/options_list/suggestions_sorting';
import { OptionsListStrings } from './options_list_strings';
import { ControlEditorProps, OptionsListEmbeddableInput } from '../..';

const SwitchWithTooltip = ({
  label,
  tooltip,
  initialChecked,
  onSwitchChange,
  ...rest
}: {
  label: string;
  tooltip: string;
  initialChecked: boolean;
  onSwitchChange: () => void;
}) => {
  const [checked, setChecked] = useState(initialChecked);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" {...rest}>
      <EuiFlexItem grow={false}>
        <EuiSwitch
          label={label}
          checked={checked}
          onChange={(event) => {
            setChecked(event.target.checked);
            onSwitchChange();
          }}
          {...rest}
        />
      </EuiFlexItem>
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
};

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

  return (
    <>
      <EuiFormRow>
        <EuiSwitch
          label={OptionsListStrings.editor.getAllowMultiselectTitle()}
          checked={!state.singleSelect}
          onChange={() => {
            onChange({ singleSelect: !state.singleSelect });
            setState((s) => ({ ...s, singleSelect: !s.singleSelect }));
          }}
          data-test-subj={'optionsListControl__allowMultipleAdditionalSetting'}
        />
      </EuiFormRow>
      <EuiFormRow>
        <SwitchWithTooltip
          label={'Enable substring search'}
          tooltip={
            'By default, searching only matches on a prefix. The results might take longer to populate.'
          }
          initialChecked={Boolean(state.wildcardSearch)}
          onSwitchChange={() => {
            onChange({ wildcardSearch: !state.wildcardSearch });
            setState((s) => ({ ...s, wildcardSearch: !s.wildcardSearch }));
          }}
          data-test-subj={'optionsListControl__wildcareQueryAdditionalSetting'}
        />
      </EuiFormRow>
      <EuiFormRow>
        <SwitchWithTooltip
          label={OptionsListStrings.editor.getRunPastTimeoutTitle()}
          tooltip={OptionsListStrings.editor.getRunPastTimeoutTooltip()}
          initialChecked={Boolean(state.runPastTimeout)}
          onSwitchChange={() => {
            onChange({ runPastTimeout: !state.runPastTimeout });
            setState((s) => ({ ...s, runPastTimeout: !s.runPastTimeout }));
          }}
          data-test-subj={'optionsListControl__runPastTimeoutAdditionalSetting'}
        />
      </EuiFormRow>
    </>
  );
};
