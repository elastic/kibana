/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiInlineEditTitle, EuiInlineEditTitleProps } from '@elastic/eui';
import { RULE_NAME_ARIA_LABEL_TEXT, RULE_NAME_INPUT_TITLE } from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';

export const RulePageNameInput = () => {
  const { formData, errors = {} } = useRuleFormState();

  const { name } = formData;

  const dispatch = useRuleFormDispatch();

  const editModeProps: EuiInlineEditTitleProps['editModeProps'] = useMemo(() => {
    return {
      saveButtonProps: {
        color: 'primary',
      },
      cancelButtonProps: {
        display: 'empty',
      },
      formRowProps: {
        isInvalid: errors.name?.length > 0,
        error: errors.name,
      },
    };
  }, [errors]);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: 'setName',
        payload: e.target.value,
      });
    },
    [dispatch]
  );

  const onInputCancel = useCallback(
    (prevValue: string) => {
      dispatch({
        type: 'setName',
        payload: prevValue,
      });
    },
    [dispatch]
  );

  return (
    <EuiInlineEditTitle
      heading="h3"
      value={name}
      placeholder={RULE_NAME_INPUT_TITLE}
      onCancel={onInputCancel}
      onChange={onInputChange}
      inputAriaLabel={RULE_NAME_ARIA_LABEL_TEXT}
      editModeProps={editModeProps}
    />
  );
};
