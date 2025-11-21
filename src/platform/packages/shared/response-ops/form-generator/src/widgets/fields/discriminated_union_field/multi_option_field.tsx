/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiCheckableCard, EuiFormFieldset, EuiSpacer, EuiTitle } from '@elastic/eui';
import { getMeta } from '../../../schema_metadata';
import {
  getDiscriminatorFieldValue,
  type DiscriminatedUnionWithProps,
} from './discriminated_union_field';
import { SingleOptionUnionField } from './single_option_field';

const getDefaultOption = (
  options: DiscriminatedUnionWithProps['options'],
  discriminatorKey: string,
  fieldConfig: DiscriminatedUnionWithProps['fieldConfig']
) => {
  if (fieldConfig?.defaultValue && typeof fieldConfig.defaultValue === 'object') {
    const defaultValue = fieldConfig.defaultValue as Record<string, any>;
    const defaultOption = options.find(
      (option) =>
        getDiscriminatorFieldValue(option, discriminatorKey) === defaultValue[discriminatorKey]
    );
    if (defaultOption) {
      return defaultOption;
    }
  }
  return options[0];
};

export const MultiOptionUnionField: React.FC<DiscriminatedUnionWithProps> = ({
  path: rootPath,
  options,
  discriminatorKey,
  schema,
  fieldConfig,
  fieldProps,
  formConfig,
}) => {
  const defaultOption = getDefaultOption(options, discriminatorKey, fieldConfig);
  const [selectedOption, setSelectedOption] = useState(() =>
    getDiscriminatorFieldValue(defaultOption, discriminatorKey)
  );

  return (
    <EuiFormFieldset
      legend={{
        children: (
          <EuiTitle size="xxs">
            <h4>{fieldProps.label as string}</h4>
          </EuiTitle>
        ),
      }}
    >
      {options.map((option) => {
        const discriminatorValue = getDiscriminatorFieldValue(option, discriminatorKey) as string;
        const onChange = () => setSelectedOption(discriminatorValue);
        const label = getMeta(option).label;
        const isChecked = selectedOption === discriminatorValue;

        return (
          <React.Fragment key={discriminatorValue}>
            <EuiCheckableCard
              onChange={onChange}
              label={label as string}
              id={discriminatorValue}
              checked={isChecked}
              data-test-subj={`form-generator-field-${rootPath}-${discriminatorValue}`}
            >
              {isChecked && (
                <SingleOptionUnionField
                  options={[option]}
                  path={`${rootPath}.${discriminatorValue}`}
                  schema={schema}
                  discriminatorKey={discriminatorKey}
                  fieldConfig={fieldConfig}
                  fieldProps={fieldProps}
                  formConfig={formConfig}
                />
              )}
            </EuiCheckableCard>
            <EuiSpacer size="xs" />
          </React.Fragment>
        );
      })}
    </EuiFormFieldset>
  );
};
