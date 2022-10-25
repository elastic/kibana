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
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { OptionsListStrings } from './options_list_strings';
import { ControlEditorProps, OptionsListEmbeddableInput } from '../..';
import { pluginServices } from '../../services';

interface OptionsListEditorState {
  singleSelect?: boolean;
  runPastTimeout?: boolean;
  hideExclude?: boolean;
  hideExists?: boolean;
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

  const {
    documentationLinks: { existsQueryDocLink },
  } = pluginServices.getServices();

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
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={OptionsListStrings.editor.getHideExistsQueryTitle()}
              checked={!state.hideExists}
              onChange={() => {
                onChange({ hideExists: !state.hideExists });
                setState((s) => ({ ...s, hideExists: !s.hideExists }));
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              href={existsQueryDocLink}
              iconType="documentation"
              aria-label="Link to exists query documentation"
              target="_blank"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiFormRow>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={OptionsListStrings.editor.getRunPastTimeoutTitle()}
              checked={Boolean(state.runPastTimeout)}
              onChange={() => {
                onChange({ runPastTimeout: !state.runPastTimeout });
                setState((s) => ({ ...s, runPastTimeout: !s.runPastTimeout }));
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              margin-top: 0px !important;
            `}
          >
            <EuiIconTip
              content={OptionsListStrings.editor.getRunPastTimeoutTooltip()}
              position="right"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </>
  );
};
