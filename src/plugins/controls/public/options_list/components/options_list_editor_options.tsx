/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { OptionsListStrings } from './options_list_strings';
import { ControlEditorProps, OptionsListEmbeddableInput } from '../..';
interface OptionsListEditorState {
  singleSelect?: boolean;
  runPastTimeout?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
}

interface SwitchProps {
  checked: boolean;
  onChange: (event: EuiSwitchEvent) => void;
}

export const OptionsListEditorOptions = ({
  initialInput,
  onChange,
}: ControlEditorProps<OptionsListEmbeddableInput>) => {
  const [state, setState] = useState<OptionsListEditorState>({
    singleSelect: initialInput?.singleSelect,
    runPastTimeout: initialInput?.runPastTimeout,
    hideExclude: initialInput?.hideExclude,
    hideExists: initialInput?.hideExists,
  });

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
