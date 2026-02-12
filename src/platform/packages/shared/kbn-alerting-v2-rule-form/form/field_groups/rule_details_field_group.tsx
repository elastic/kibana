/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldText, EuiTextArea, EuiComboBox, EuiSwitch } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';

const NAME_ROW_ID = 'ruleV2FormNameField';
const DESCRIPTION_ROW_ID = 'ruleV2FormDescriptionField';

export const RuleDetailsFieldGroup: React.FC = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<FormValues>();
  return (
    <FieldGroup
      title={i18n.translate('xpack.esqlRuleForm.ruleDetails', {
        defaultMessage: 'Rule details',
      })}
    >
      <EuiFormRow
        id={NAME_ROW_ID}
        label={i18n.translate('xpack.esqlRuleForm.nameLabel', {
          defaultMessage: 'Name',
        })}
        isInvalid={!!errors.name}
        error={errors.name?.message}
      >
        <Controller
          name="name"
          control={control}
          rules={{
            required: i18n.translate('xpack.esqlRuleForm.nameRequiredError', {
              defaultMessage: 'Name is required.',
            }),
          }}
          render={({ field: { ref, ...field } }) => <EuiFieldText {...field} inputRef={ref} />}
        />
      </EuiFormRow>

      <EuiFormRow
        id={DESCRIPTION_ROW_ID}
        label={i18n.translate('xpack.esqlRuleForm.descriptionLabel', {
          defaultMessage: 'Description',
        })}
        helpText={i18n.translate('xpack.esqlRuleForm.descriptionHelpText', {
          defaultMessage: 'Optional description for this rule.',
        })}
      >
        <Controller
          name="description"
          control={control}
          render={({ field: { ref, ...field } }) => (
            <EuiTextArea {...field} inputRef={ref} rows={2} />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.esqlRuleForm.tagsLabel', {
          defaultMessage: 'Tags',
        })}
      >
        <Controller
          name="tags"
          control={control}
          render={({ field }) => {
            const selectedOptions = (field.value ?? []).map((val) => ({ label: val }));
            const options = selectedOptions;

            return (
              <EuiComboBox
                options={options}
                selectedOptions={selectedOptions}
                onChange={(selected) => field.onChange(selected.map(({ label }) => label))}
                onCreateOption={(searchValue) => {
                  field.onChange([...(field.value ?? []), searchValue]);
                }}
                isClearable={true}
              />
            );
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.esqlRuleForm.enabledLabel', {
          defaultMessage: 'Enabled',
        })}
        helpText={i18n.translate('xpack.esqlRuleForm.enabledHelpText', {
          defaultMessage: 'When enabled, the rule will run on the defined schedule.',
        })}
      >
        <Controller
          name="enabled"
          control={control}
          render={({ field: { value, onChange } }) => (
            <EuiSwitch
              label={
                value
                  ? i18n.translate('xpack.esqlRuleForm.enabledOnLabel', {
                      defaultMessage: 'On',
                    })
                  : i18n.translate('xpack.esqlRuleForm.enabledOffLabel', {
                      defaultMessage: 'Off',
                    })
              }
              checked={value ?? true}
              onChange={(e) => onChange(e.target.checked)}
            />
          )}
        />
      </EuiFormRow>
    </FieldGroup>
  );
};
