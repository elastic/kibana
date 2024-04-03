/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { EuiDescribedFormGroup, EuiFormRow, EuiFieldText, EuiComboBox } from '@elastic/eui';
import { useRuleFormDispatch, useRuleFormSelector, useRuleNameGuard } from '../../hooks';
import { setRuleName, addTag, setTags } from './slice';

export const RuleDetails: React.FC = () => {
  const dispatch = useRuleFormDispatch();
  const ruleName = useRuleFormSelector((state) => state.ruleDetails.name);
  const tags = useRuleFormSelector((state) => state.ruleDetails.tags);

  const { onRuleNameFocus, onRuleNameBlur } = useRuleNameGuard();

  const tagsOptions = useMemo(() => tags.map((label: string) => ({ label })), [tags]);

  const onChangeNameField = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => dispatch(setRuleName(value)),
    [dispatch]
  );
  //
  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          {i18n.translate('alertsUIShared.ruleForm.ruleDetailsTitle', {
            defaultMessage: 'Rule name and tags',
          })}
        </h3>
      }
      description={i18n.translate('alertsUIShared.ruleForm.ruleDetailsDescription', {
        defaultMessage: 'Define a name and tags for your rule.',
      })}
    >
      <EuiFormRow
        fullWidth
        label={i18n.translate('alertsUIShared.ruleForm.ruleNameFieldLabel', {
          defaultMessage: 'Rule name',
        })}
      >
        <EuiFieldText
          fullWidth
          isInvalid={!ruleName}
          value={ruleName}
          onChange={onChangeNameField}
          onFocus={onRuleNameFocus}
          onBlur={onRuleNameBlur}
          data-test-subj="ruleNameField"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('alertsUIShared.ruleForm.ruleTagsFieldLabel', {
          defaultMessage: 'Tags',
        })}
      >
        <EuiComboBox
          fullWidth
          noSuggestions
          data-test-subj="tagsComboBox"
          selectedOptions={tagsOptions}
          onCreateOption={(searchValue: string) => {
            dispatch(addTag(searchValue));
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            dispatch(setTags(selectedOptions.map((selectedOption) => selectedOption.label)));
          }}
          onBlur={() => {
            if (!tags) {
              dispatch(setTags([]));
            }
          }}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
