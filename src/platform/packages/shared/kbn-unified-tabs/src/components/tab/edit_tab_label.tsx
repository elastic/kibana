/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { EuiFieldText, keys, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TabItem } from '../../types';
import { MAX_TAB_LABEL_LENGTH } from '../../constants';

enum SubmitState {
  initial = 'initial',
  submitting = 'submitting',
  error = 'error',
}

export interface EditTabLabelProps {
  item: TabItem;
  onLabelEdited: (item: TabItem, newLabel: string) => Promise<void>;
  onExit: () => void;
}

export const EditTabLabel: React.FC<EditTabLabelProps> = ({ item, onLabelEdited, onExit }) => {
  const { euiTheme } = useEuiTheme();
  const [value, setValue] = useState<string>(item.label);
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.initial);
  const [inputNode, setInputNode] = useState<HTMLInputElement | null>(null);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
    },
    [setValue]
  );

  const onSubmit = useCallback(
    async (newLabel: string) => {
      if (!newLabel) {
        return;
      }

      if (newLabel === item.label) {
        onExit();
        return;
      }

      setSubmitState(SubmitState.submitting);
      try {
        await onLabelEdited(item, newLabel);
        onExit();
      } catch {
        setSubmitState(SubmitState.error);
      }
    },
    [item, onLabelEdited, onExit, setSubmitState]
  );

  const onKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === keys.ESCAPE) {
        onExit();
        return;
      }

      if (event.key === keys.ENTER) {
        await onSubmit(value.trim());
      }
    },
    [value, onSubmit, onExit]
  );

  useEffect(() => {
    if (inputNode) {
      inputNode.focus();
    }
  }, [inputNode]);

  return (
    <EuiFieldText
      inputRef={setInputNode}
      data-test-subj={`unifiedTabs_editTabLabelInput_${item.id}`}
      css={css`
        block-size: 28px;
        margin-top: ${euiTheme.size.xxs};
      `}
      compressed
      value={value}
      maxLength={MAX_TAB_LABEL_LENGTH}
      isLoading={submitState === SubmitState.submitting}
      isInvalid={submitState === SubmitState.error || !value.trim()}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={submitState !== SubmitState.submitting ? onExit : undefined}
    />
  );
};
