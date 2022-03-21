/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { get } from 'lodash';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiSpacer,
  EuiTitle,
  EuiHealth,
} from '@elastic/eui';

import { TextField, SelectField, SuperSelectField } from '../../../components';
import { fieldValidators } from '../../../helpers';
import { useFormData } from '../../hooks';
import { UseField } from '../use_field';
import { UseArray } from '../use_array';

const { emptyField } = fieldValidators;

const typeOptions = [
  { value: 'type_one', text: 'Type one' },
  { value: 'type_two', text: 'Type two' },
];

const processorTypeOptions = [
  { value: 'percentage', text: 'Percentage' },
  { value: 'value', text: 'Value' },
];

const percentageOptions = [
  {
    value: 'percentage_config_1',
    inputDisplay: (
      <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
        Percentage 1
      </EuiHealth>
    ),
  },
  {
    value: 'percentage_config_2',
    inputDisplay: (
      <EuiHealth color="warning" style={{ lineHeight: 'inherit' }}>
        Percentage 2
      </EuiHealth>
    ),
  },
  {
    value: 'percentage_config_3',
    inputDisplay: (
      <EuiHealth color="danger" style={{ lineHeight: 'inherit' }}>
        Percentage 3
      </EuiHealth>
    ),
  },
];

const valueOptions = [
  {
    value: 'value_config_1',
    inputDisplay: (
      <EuiHealth color="subdued" style={{ lineHeight: 'inherit' }}>
        Value 1
      </EuiHealth>
    ),
  },
  {
    value: 'value_config_2',
    inputDisplay: (
      <EuiHealth color="warning" style={{ lineHeight: 'inherit' }}>
        Value 2
      </EuiHealth>
    ),
  },
  {
    value: 'value_config_3',
    inputDisplay: (
      <EuiHealth color="danger" style={{ lineHeight: 'inherit' }}>
        Value 3
      </EuiHealth>
    ),
  },
];

const PercentageConfigSelect = ({ path }: { path: string }) => {
  return (
    <UseField
      path={path}
      component={SuperSelectField}
      defaultValue={percentageOptions[0].value}
      config={{ label: 'Config' }}
      componentProps={{
        euiFieldProps: {
          options: percentageOptions,
        },
      }}
    />
  );
};

const ValueConfigSelect = ({ path }: { path: string }) => {
  return (
    <UseField
      path={path}
      component={SuperSelectField}
      defaultValue={valueOptions[0].value}
      config={{ label: 'Config' }}
      componentProps={{
        euiFieldProps: {
          options: valueOptions,
        },
      }}
    />
  );
};

const ProcessorTypeConfigurator = ({ basePath }: { basePath: string }) => {
  const processorTypePath = `${basePath}.type`;
  const processorConfigPath = `${basePath}.config`;
  const [formData] = useFormData({ watch: processorTypePath });
  const processorType = get(formData, processorTypePath);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path={processorTypePath}
          config={{ label: 'Processor type', defaultValue: 'percentage' }}
          component={SelectField}
          componentProps={{
            euiFieldProps: {
              options: processorTypeOptions,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {processorType === 'percentage' ? (
          <PercentageConfigSelect path={processorConfigPath} />
        ) : (
          <ValueConfigSelect path={processorConfigPath} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function Complex() {
  return (
    <>
      <EuiTitle>
        <h2>Rule configurator</h2>
      </EuiTitle>
      <EuiSpacer size="xl" />
      <UseField
        path="ruleType"
        config={{
          label: 'Rule type',
          defaultValue: 'type_one',
        }}
        component={SelectField}
        componentProps={{
          euiFieldProps: {
            options: typeOptions,
          },
        }}
      />
      <EuiSpacer />

      <EuiTitle size="s">
        <h2>Processors</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <UseArray path="processors">
        {({ items, addItem, removeItem }) => {
          return (
            <>
              {items.map(({ id, path }) => {
                return (
                  <EuiFlexGroup key={id} alignItems="center">
                    <EuiFlexItem grow={false}>
                      <UseField
                        path={`${path}.name`}
                        config={{
                          label: 'Name',
                          validations: [{ validator: emptyField('A name is required.') }],
                        }}
                        component={TextField}
                        componentProps={{
                          euiFieldProps: {
                            style: {
                              maxWidth: '180px',
                            },
                          },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <ProcessorTypeConfigurator basePath={path} />
                    </EuiFlexItem>
                    {items.length > 1 && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="minusInCircle"
                          onClick={() => removeItem(id)}
                          aria-label="Remove processor"
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                );
              })}
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiButtonEmpty onClick={addItem}>Add processor</EuiButtonEmpty>
              </EuiFlexGroup>
            </>
          );
        }}
      </UseArray>
    </>
  );
}

Complex.storyName = 'Complex';
