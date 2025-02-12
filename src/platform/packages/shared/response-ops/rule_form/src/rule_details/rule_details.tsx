/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiText,
} from '@elastic/eui';
import {
  RULE_DETAILS_TITLE,
  RULE_DETAILS_DESCRIPTION,
  RULE_NAME_INPUT_TITLE,
  RULE_TAG_INPUT_TITLE,
  RULE_TAG_PLACEHOLDER,
} from '../translations';
import { useRuleFormState, useRuleFormDispatch } from '../hooks';
import { OptionalFieldLabel } from '../optional_field_label';

export const RuleDetails = () => {
  const { formData, baseErrors } = useRuleFormState();

  const dispatch = useRuleFormDispatch();

  const { tags = [], name } = formData;

  const tagsOptions = useMemo(() => {
    return tags.map((tag: string) => ({ label: tag }));
  }, [tags]);

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({
        type: 'setName',
        payload: e.target.value,
      });
    },
    [dispatch]
  );

  const onAddTag = useCallback(
    (searchValue: string) => {
      dispatch({
        type: 'setTags',
        payload: tags.concat([searchValue]),
      });
    },
    [dispatch, tags]
  );

  const onSetTag = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      dispatch({
        type: 'setTags',
        payload: options.map((selectedOption) => selectedOption.label),
      });
    },
    [dispatch]
  );

  const onBlur = useCallback(() => {
    if (!tags) {
      dispatch({
        type: 'setTags',
        payload: [],
      });
    }
  }, [dispatch, tags]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{RULE_DETAILS_TITLE}</h3>}
      description={
        <EuiText size="s">
          <p>{RULE_DETAILS_DESCRIPTION}</p>
        </EuiText>
      }
      data-test-subj="ruleDetails"
    >
      <EuiFormRow
        fullWidth
        label={RULE_NAME_INPUT_TITLE}
        isInvalid={!!baseErrors?.name?.length}
        error={baseErrors?.name}
      >
        <EuiFieldText
          fullWidth
          value={name}
          placeholder={RULE_NAME_INPUT_TITLE}
          onChange={onNameChange}
          data-test-subj="ruleDetailsNameInput"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={RULE_TAG_INPUT_TITLE}
        labelAppend={OptionalFieldLabel}
        isInvalid={!!baseErrors?.tags?.length}
        error={baseErrors?.tags}
      >
        <EuiComboBox
          fullWidth
          noSuggestions
          placeholder={RULE_TAG_PLACEHOLDER}
          data-test-subj="ruleDetailsTagsInput"
          selectedOptions={tagsOptions}
          onCreateOption={onAddTag}
          onChange={onSetTag}
          onBlur={onBlur}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
