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
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSuperSelectOption,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiSwitchEvent,
  EuiButtonGroup,
  toSentenceCase,
  Direction,
} from '@elastic/eui';
import { css } from '@emotion/react';

import {
  getCompatibleSortingTypes,
  sortDirections,
  DEFAULT_SORT,
  OptionsListSortBy,
} from '../../../common/options_list/suggestions_sorting';
import { OptionsListStrings } from './options_list_strings';
import { ControlEditorProps, OptionsListEmbeddableInput } from '../..';

interface OptionsListEditorState {
  sortDirection: Direction;
  runPastTimeout?: boolean;
  singleSelect?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
  hideSort?: boolean;
  sortBy: OptionsListSortBy;
}

interface SwitchProps {
  checked: boolean;
  onChange: (event: EuiSwitchEvent) => void;
}

type SortItem = EuiSuperSelectOption<OptionsListSortBy>;

export const OptionsListEditorOptions = ({
  initialInput,
  onChange,
  fieldType,
}: ControlEditorProps<OptionsListEmbeddableInput>) => {
  const [state, setState] = useState<OptionsListEditorState>({
    sortDirection: initialInput?.sort?.direction ?? DEFAULT_SORT.direction,
    sortBy: initialInput?.sort?.by ?? DEFAULT_SORT.by,
    runPastTimeout: initialInput?.runPastTimeout,
    singleSelect: initialInput?.singleSelect,
    hideExclude: initialInput?.hideExclude,
    hideExists: initialInput?.hideExists,
    hideSort: initialInput?.hideSort,
  });

  useEffect(() => {
    // when field type changes, ensure that the selected sort type is still valid
    if (!getCompatibleSortingTypes(fieldType).includes(state.sortBy)) {
      onChange({ sort: DEFAULT_SORT });
      setState((s) => ({ ...s, sortBy: DEFAULT_SORT.by, sortDirection: DEFAULT_SORT.direction }));
    }
  }, [fieldType, onChange, state.sortBy]);

  const sortByOptions: SortItem[] = useMemo(() => {
    return getCompatibleSortingTypes(fieldType).map((key: OptionsListSortBy) => {
      return {
        value: key,
        inputDisplay: OptionsListStrings.editorAndPopover.sortBy[key].getSortByLabel(),
        'data-test-subj': `optionsListEditor__sortBy_${key}`,
      };
    });
  }, [fieldType]);

  const sortOrderOptions = useMemo(() => {
    return sortDirections.map((key) => {
      return {
        id: key,
        value: key,
        iconType: `sort${toSentenceCase(key)}ending`,
        'data-test-subj': `optionsListEditor__sortOrder_${key}`,
        label: OptionsListStrings.editorAndPopover.sortOrder[key].getSortOrderLabel(),
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
          data-test-subj={'optionsListControl__allowMultipleAdditionalSetting'}
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
          data-test-subj={'optionsListControl__hideExcludeAdditionalSetting'}
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
          data-test-subj={'optionsListControl__hideExistsAdditionalSetting'}
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
            data-test-subj={'optionsListControl__hideSortAdditionalSetting'}
          />
          {state.hideSort && (
            <EuiForm className="optionsList--hiddenEditorForm">
              <>
                <EuiSpacer size="s" />
                <EuiFormRow
                  display={'rowCompressed'}
                  label={OptionsListStrings.editor.getSuggestionsSortingTitle()}
                >
                  <EuiButtonGroup
                    buttonSize="compressed"
                    options={sortOrderOptions}
                    idSelected={state.sortDirection}
                    onChange={(value) => {
                      onChange({
                        sort: {
                          direction: value as Direction,
                          by: state.sortBy,
                        },
                      });
                      setState((s) => ({ ...s, sortDirection: value as Direction }));
                    }}
                    legend={OptionsListStrings.editorAndPopover.getSortDirectionLegend()}
                  />
                </EuiFormRow>
                <EuiFormRow
                  display={'rowCompressed'}
                  css={css`
                    margin-top: 8px !important;
                  `}
                  hasEmptyLabelSpace={false}
                >
                  <EuiSuperSelect
                    onChange={(value) => {
                      onChange({
                        sort: {
                          direction: state.sortDirection,
                          by: value,
                        },
                      });
                      setState((s) => ({ ...s, sortBy: value }));
                    }}
                    options={sortByOptions}
                    valueOfSelected={state.sortBy}
                    data-test-subj={'optionsListControl__chooseSortBy'}
                    compressed={true}
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
          data-test-subj={'optionsListControl__runPastTimeoutAdditionalSetting'}
        />
      </EuiFormRow>
    </>
  );
};
