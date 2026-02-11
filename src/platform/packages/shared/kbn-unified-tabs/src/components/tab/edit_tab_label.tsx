/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { EuiFieldText, keys, mathWithUnits, useEuiTheme } from '@elastic/eui';
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

export const EditTabLabel: React.FC<EditTabLabelProps> = ({
  item,
  onLabelEdited,
  onExit: onExitOriginal,
}) => {
  const { euiTheme } = useEuiTheme();
  const [value, setValue] = useState<string>(item.label);
  const [submitState, setSubmitState] = useState<SubmitState>(SubmitState.initial);
  const [inputNode, setInputNode] = useState<HTMLInputElement | null>(null);
  const isFinishedRef = useRef<boolean>(false);

  const onExit = useCallback(() => {
    isFinishedRef.current = true;
    onExitOriginal();
  }, [onExitOriginal]);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
    },
    [setValue]
  );

  const onSubmit = useCallback(
    async (nextLabel: string) => {
      const newLabel = nextLabel.trim();
      if (!newLabel || newLabel.length > MAX_TAB_LABEL_LENGTH) {
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
        await onSubmit(value);
      }
    },
    [value, onSubmit, onExit]
  );

  const onBlur = useCallback(async () => {
    if (isFinishedRef.current) {
      return;
    }
    if (submitState !== SubmitState.initial) {
      onExit();
      return;
    }
    return onSubmit(value);
  }, [value, submitState, onSubmit, onExit]);

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
        block-size: ${mathWithUnits([euiTheme.size.xl, euiTheme.size.xs], (xl, xs) => xl - xs)};
        margin-top: ${euiTheme.size.xxs};
      `}
      compressed
      value={value}
      maxLength={MAX_TAB_LABEL_LENGTH}
      isLoading={submitState === SubmitState.submitting}
      isInvalid={
        submitState === SubmitState.error || !value.trim() || value.length > MAX_TAB_LABEL_LENGTH
      }
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={submitState !== SubmitState.submitting ? onBlur : undefined}
    />
  );
};
