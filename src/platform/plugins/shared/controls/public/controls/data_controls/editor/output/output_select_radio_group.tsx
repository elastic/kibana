/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useGeneratedHtmlId, EuiCheckableCard, EuiText, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { ControlOutputOption, DEFAULT_CONTROL_OUTPUT } from '../../../../../common';
import { CONTROL_OUTPUT_OPTIONS } from '../editor_constants';

export const OutputSelectRadioGroup: React.FC<{
  idSelected?: ControlOutputOption;
  onChangeOutput: (option: string) => void;
  fieldName?: string;
  isDSLInputMode: boolean;
}> = ({ idSelected = DEFAULT_CONTROL_OUTPUT, onChangeOutput, fieldName, isDSLInputMode }) => {
  const radioGroupId = useGeneratedHtmlId({ prefix: 'radioGroup' });
  return CONTROL_OUTPUT_OPTIONS.map(
    ({ id, label, description, 'data-test-subj': dataTestSubj }) => (
      <>
        <EuiCheckableCard
          id={id}
          name={radioGroupId}
          key={radioGroupId}
          checkableType="radio"
          label={<strong>{label}</strong>}
          checked={idSelected === id}
          onChange={() => onChangeOutput(id)}
          data-test-subj={dataTestSubj}
        >
          <EuiText size="s">{description(isDSLInputMode, fieldName)}</EuiText>
          {/**
           * Add a click target to allow the user to click anywhere on the EuiCheckableCard to select an output
           * option, instead of having to target the radio button or the title label.
           * EuiCheckableCard does not make the whole body clickable to allow for interactive children
           * https://github.com/elastic/eui/issues/8900
           * Overlay the inner card panel with an invisible clickable div; disable a11y linting rule
           * because the radio group is already the a11y target, and clickable div is purely a
           * workaround for mouse interaction
           */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            onClick={() => onChangeOutput(id)}
            data-test-subj="output-select-click-target"
            css={css`
              cursor: pointer;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
            `}
          />
        </EuiCheckableCard>
        <EuiSpacer size="s" />
      </>
    )
  );
};
