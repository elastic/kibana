/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSuperSelectOption,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { OptionsListStrings } from './options_list_strings';
import { ControlEditorProps, OptionsListEmbeddableInput } from '../..';
import {
  DEFAULT_SORT,
  OptionsListSortingTypes,
  SortingType,
} from '@kbn/controls-plugin/common/options_list/suggestions_sorting';
interface OptionsListEditorState {
  selectedSort: SortingType;
  runPastTimeout?: boolean;
  singleSelect?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
}

interface SwitchProps {
  checked: boolean;
  onChange: (event: EuiSwitchEvent) => void;
}

type SortItem = EuiSuperSelectOption<SortingType>;

export const OptionsListEditorOptions = ({
  initialInput,
  onChange,
}: ControlEditorProps<OptionsListEmbeddableInput>) => {
  const [state, setState] = useState<OptionsListEditorState>({
    singleSelect: initialInput?.singleSelect,
    runPastTimeout: initialInput?.runPastTimeout,
    hideExclude: initialInput?.hideExclude,
    hideExists: initialInput?.hideExists,
    hideSort: initialInput?.hideSort,
    selectedSort: initialInput?.sort ?? DEFAULT_SORT,
  });

  const options: SortItem[] = useMemo(() => {
    return (Object.keys(OptionsListSortingTypes) as SortingType[]).map((key) => {
      return {
        value: key,
        inputDisplay: OptionsListStrings.popover.sortBy[key].getSortByLabel(),
      };
    });
  }, []);

  const SwitchWithTooltip = ({
    switchProps,
    label,
    tooltip,
  }: {
    switchProps: SwitchProps;
    label: string;
    tooltip: string;
  }) => (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiSwitch label={label} {...switchProps} />
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
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiSwitch
          label={OptionsListStrings.editor.getHideExcludeTitle()}
          checked={!state.hideExclude}
          onChange={() => {
            onChange({ hideExclude: !state.hideExclude });
            setState((s) => ({ ...s, hideExclude: !s.hideExclude }));
            if (initialInput?.exclude) onChange({ exclude: false });
          }}
        />
      </EuiFormRow>
      <EuiFormRow>
        <SwitchWithTooltip
          label={OptionsListStrings.editor.getHideExistsQueryTitle()}
          tooltip={OptionsListStrings.editor.getHideExistsQueryTooltip()}
          switchProps={{
            checked: !state.hideExists,
            onChange: () => {
              onChange({ hideExists: !state.hideExists });
              setState((s) => ({ ...s, hideExists: !s.hideExists }));
              if (initialInput?.existsSelected) onChange({ existsSelected: false });
            },
          }}
        />
      </EuiFormRow>
      <EuiFormRow>
        <>
          <EuiSwitch
            label={OptionsListStrings.editor.getHideSortingTitle()}
            checked={!state.hideSort}
            onChange={() => {
              onChange({ hideSort: !state.hideSort });
              setState((s) => ({ ...s, hideSort: !s.hideSort }));
            }}
          />
          {state.hideSort && (
            <EuiForm className="optionsList--hiddenEditorForm">
              <>
                <EuiSpacer size="s" />
                <EuiFormRow label={OptionsListStrings.editor.getSuggestionsSortingTitle()}>
                  <EuiSuperSelect
                    onChange={(value) => {
                      onChange({
                        sort: value,
                      });
                      setState((s) => ({ ...s, selectedSort: value }));
                    }}
                    options={options}
                    valueOfSelected={state.selectedSort}
                  />
                </EuiFormRow>
                <EuiSpacer size="s" />
              </>
            </EuiForm>
          )}
        </>
      </EuiFormRow>
      <EuiFormRow>
        <SwitchWithTooltip
          label={OptionsListStrings.editor.getRunPastTimeoutTitle()}
          tooltip={OptionsListStrings.editor.getRunPastTimeoutTooltip()}
          switchProps={{
            checked: Boolean(state.runPastTimeout),
            onChange: () => {
              onChange({ runPastTimeout: !state.runPastTimeout });
              setState((s) => ({ ...s, runPastTimeout: !s.runPastTimeout }));
            },
          }}
        />
      </EuiFormRow>
    </>
  );
};
