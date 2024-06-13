/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import type { RuleFormErrors, Rule, RuleTypeParams } from '../../common';
import {
  RULE_DETAILS_TITLE,
  RULE_DETAILS_DESCRIPTION,
  RULE_NAME_INPUT_TITLE,
  RULE_TAG_INPUT_TITLE,
} from '../translations';

export interface RuleDetailsProps {
  formValues: {
    tags?: Rule<RuleTypeParams>['tags'];
    name: Rule<RuleTypeParams>['name'];
  };
  errors?: RuleFormErrors;
  onChange: (property: string, value: unknown) => void;
}

export const RuleDetails = (props: RuleDetailsProps) => {
  const { formValues, errors = {}, onChange } = props;

  const { tags = [], name } = formValues;

  const tagsOptions = useMemo(() => {
    return tags.map((tag: string) => ({ label: tag }));
  }, [tags]);

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange('name', e.target.value);
    },
    [onChange]
  );

  const onAddTag = useCallback(
    (searchValue: string) => {
      onChange('tags', tags.concat([searchValue]));
    },
    [onChange, tags]
  );

  const onSetTag = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(
        'tags',
        options.map((selectedOption) => selectedOption.label)
      );
    },
    [onChange]
  );

  const onBlur = useCallback(() => {
    if (!tags) {
      onChange('tags', []);
    }
  }, [onChange, tags]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{RULE_DETAILS_TITLE}</h3>}
      description={
        <EuiText>
          <p>{RULE_DETAILS_DESCRIPTION}</p>
        </EuiText>
      }
      data-test-subj="ruleDetails"
    >
      <EuiFormRow
        fullWidth
        label={RULE_NAME_INPUT_TITLE}
        isInvalid={errors.name?.length > 0}
        error={errors.name}
      >
        <EuiFieldText
          fullWidth
          value={name}
          onChange={onNameChange}
          data-test-subj="ruleDetailsNameInput"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={RULE_TAG_INPUT_TITLE}
        isInvalid={errors.tags?.length > 0}
        error={errors.tags}
      >
        <EuiComboBox
          fullWidth
          noSuggestions
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
