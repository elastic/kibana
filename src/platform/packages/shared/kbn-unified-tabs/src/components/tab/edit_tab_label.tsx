/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { EuiFieldText, keys } from '@elastic/eui';
import type { TabItem } from '../../types';

enum SubmitState {
  initial = 'initial',
  submitting = 'submitting',
  error = 'error',
}

export interface EditTabLabelProps {
  item: TabItem;
  onLabelEdited: (item: TabItem, newLabel: string) => void;
  onExit: () => void;
}

export const EditTabLabel: React.FC<EditTabLabelProps> = ({ item, onLabelEdited, onExit }) => {
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
    (newLabel: string) => {
      if (!newLabel) {
        return;
      }

      if (newLabel === item.label) {
        onExit();
        return;
      }

      setSubmitState(SubmitState.submitting);
      try {
        onLabelEdited(item, newLabel);
        onExit();
      } catch {
        setSubmitState(SubmitState.error);
      }
    },
    [item, onLabelEdited, onExit, setSubmitState]
  );

  const onKeyUp = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === keys.ESCAPE) {
        onExit();
        return;
      }

      if (event.key === keys.ENTER) {
        onSubmit(value.trim());
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
      compressed
      value={value}
      isLoading={submitState === SubmitState.submitting}
      isInvalid={submitState === SubmitState.error || !value.trim()}
      onChange={onChange}
      onKeyUp={onKeyUp}
      onBlur={submitState !== SubmitState.submitting ? onExit : undefined}
    />
  );
};
