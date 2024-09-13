/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
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
import { FormConfig } from '../../types';
import { UseField } from '../use_field';
import { UseArray } from '../use_array';
import { FormWrapper } from './form_utils';

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

const configSelect = { label: 'Config' };

const PercentageConfigSelect = ({ path }: { path: string }) => {
  return (
    <UseField
      path={path}
      component={SuperSelectField}
      config={{ ...configSelect, defaultValue: percentageOptions[0].value }}
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
      config={{ ...configSelect, defaultValue: valueOptions[0].value }}
      componentProps={{
        euiFieldProps: {
          options: valueOptions,
        },
      }}
    />
  );
};

const percentageProcessorTypeConfig = { label: 'Processor type', defaultValue: 'percentage' };

const ProcessorTypeConfigurator = ({ basePath }: { basePath: string }) => {
  const processorTypePath = `${basePath}.type`;
  const processorConfigPath = `${basePath}.config`;
  const [formData] = useFormData({ watch: processorTypePath });
  const processorType = get(formData, processorTypePath);

  const renderSelect = () => {
    if (!processorType) {
      return null;
    }

    return processorType === 'percentage' ? (
      <PercentageConfigSelect path={processorConfigPath} />
    ) : (
      <ValueConfigSelect path={processorConfigPath} />
    );
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path={processorTypePath}
          config={percentageProcessorTypeConfig}
          component={SelectField}
          componentProps={{
            euiFieldProps: {
              options: processorTypeOptions,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>{renderSelect()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ProcessorsConfigurator: FC<{ ruleType: string }> = ({ ruleType }) => {
  return (
    <UseArray
      key={ruleType}
      path="processors"
      initialNumberOfItems={ruleType === 'type_one' ? 1 : 3}
    >
      {({ items, addItem, removeItem }) => {
        return (
          <>
            {items.map(({ id, path }) => {
              return (
                <EuiFlexGroup key={id} alignItems="center">
                  <EuiFlexItem grow={false}>
                    {/* Processor name */}
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
                    {/* Processor type & config */}
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

            {/* Add processor button */}
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiButtonEmpty onClick={addItem}>Add processor</EuiButtonEmpty>
            </EuiFlexGroup>
          </>
        );
      }}
    </UseArray>
  );
};

const FormContent: FC = () => {
  const [{ ruleType }] = useFormData({ watch: 'ruleType' });

  return (
    <>
      <EuiTitle>
        <h2>Rule configurator</h2>
      </EuiTitle>
      <EuiSpacer size="xl" />

      {/* Rule type */}
      <UseField
        path="ruleType"
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
      {ruleType !== undefined && <ProcessorsConfigurator ruleType={ruleType} />}
    </>
  );
};

const defaultValue = {
  ruleType: 'type_one',
  processors_type_one: [
    { name: 'Processor 1 name', type: 'value', config: 'value_config_3' },
    { name: 'Processor 2 name', type: 'percentage', config: 'percentage_config_2' },
  ],
};

const schema = {
  ruleType: {
    label: 'Rule type',
    defaultValue: 'type_one',
  },
};

const formConfig: FormConfig = {
  schema,
  defaultValue,
};

export function Complex() {
  return (
    <FormWrapper formConfig={formConfig}>
      <FormContent />
    </FormWrapper>
  );
}

Complex.storyName = 'Complex';

Complex.parameters = {
  docs: {
    source: {
      code: `
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

const configSelect = { label: 'Config' };

const PercentageConfigSelect = ({ path }: { path: string }) => {
  return (
    <UseField
      path={path}
      component={SuperSelectField}
      config={{ ...configSelect, defaultValue: percentageOptions[0].value }}
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
      config={{ ...configSelect, defaultValue: valueOptions[0].value }}
      componentProps={{
        euiFieldProps: {
          options: valueOptions,
        },
      }}
    />
  );
};

const percentageProcessorTypeConfig = { label: 'Processor type', defaultValue: 'percentage' };

const ProcessorTypeConfigurator = ({ basePath }: { basePath: string }) => {
  const processorTypePath = \`\${basePath}.type\`;
  const processorConfigPath = \`\${basePath}.config\`;
  const [formData] = useFormData({ watch: processorTypePath });
  const processorType = get(formData, processorTypePath);

  const renderSelect = () => {
    if (!processorType) {
      return null;
    }

    return processorType === 'percentage' ? (
      <PercentageConfigSelect path={processorConfigPath} />
    ) : (
      <ValueConfigSelect path={processorConfigPath} />
    );
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField
          path={processorTypePath}
          config={percentageProcessorTypeConfig}
          component={SelectField}
          componentProps={{
            euiFieldProps: {
              options: processorTypeOptions,
            },
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem>{renderSelect()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ProcessorsConfigurator: FC<{ ruleType: string }> = ({ ruleType }) => {
  return (
    <UseArray
      key={ruleType}
      path="processors"
      initialNumberOfItems={ruleType === 'type_one' ? 1 : 3}
    >
      {({ items, addItem, removeItem }) => {
        return (
          <>
            {items.map(({ id, path }) => {
              return (
                <EuiFlexGroup key={id} alignItems="center">
                  <EuiFlexItem grow={false}>
                    {/* Processor name */}
                    <UseField
                      path={\`\${path}.name\`}
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
                    {/* Processor type & config */}
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

            {/* Add processor button */}
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiButtonEmpty onClick={addItem}>Add processor</EuiButtonEmpty>
            </EuiFlexGroup>
          </>
        );
      }}
    </UseArray>
  );
};

const defaultValue = {
  ruleType: 'type_one',
  processors_type_one: [
    { name: 'Processor 1 name', type: 'value', config: 'value_config_3' },
    { name: 'Processor 2 name', type: 'percentage', config: 'percentage_config_2' },
  ],
};

const schema = {
  ruleType: {
    label: 'Rule type',
    defaultValue: 'type_one',
  },
};

const MyFormComponent = () => {
  const { form } = useForm({ schema, defaultValue });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      <EuiTitle>
        <h2>Rule configurator</h2>
      </EuiTitle>
      <EuiSpacer size="xl" />

      {/* Rule type */}
      <UseField
        path="ruleType"
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
      {ruleType !== undefined && <ProcessorsConfigurator ruleType={ruleType} />}
      <EuiSpacer />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
}
      `,
      language: 'tsx',
    },
  },
};
