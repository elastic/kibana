/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useCallback, FC } from 'react';
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
import { useFormContext } from '../../form_context';
import { UseField } from '../use_field';
import { UseArray } from '../use_array';
import { FormWrapper } from './form_utils';

const { emptyField } = fieldValidators;

// Select field options
const ruleTypeOptions = [
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

// Dynamic data that we will be loaded in the form when selecting the rule "type one"
const processorsTypeOne = [
  {
    name: 'foo 1',
    type: 'value',
    config: 'value_config_2',
  },
  {
    name: 'foo 2',
    type: 'value',
    config: 'value_config_3',
  },
  {
    name: 'foo 3',
    type: 'percentage',
    config: 'percentage_config_2',
  },
];

// Dynamic data that we will be loaded in the form when selecting the rule "type two"
const processorsTypeTwo = [
  {
    name: 'Super foo 1',
    type: 'percentage',
    config: 'percentage_config_2',
  },
  {
    name: 'Super foo 2',
    type: 'value',
    config: 'value_config_3',
  },
];

// Form field configs
const processorConfig = { label: 'Config' };
const percentageProcessorTypeConfig = { label: 'Processor type', defaultValue: 'percentage' };

const ProcessorTypeConfigurator = ({
  basePath,
  readDefaultValueOnForm,
}: {
  basePath: string;
  readDefaultValueOnForm: boolean;
}) => {
  const { getFields } = useFormContext();
  const processorTypePath = `${basePath}.type`;
  const processorConfigPath = `${basePath}.config`;
  const [formData] = useFormData({
    watch: [processorTypePath],
  });
  const processorType = get(formData, processorTypePath);
  const options = processorType === 'percentage' ? percentageOptions : valueOptions;
  const defaultOption = options[0].value;

  const onProcessorTypeChange = (newType: string) => {
    getFields()[processorConfigPath].setValue(
      (newType === 'percentage' ? percentageOptions : valueOptions)[0].value
    );
  };

  const renderSelect = useCallback(() => {
    if (!processorType) {
      return null;
    }

    return (
      <UseField
        path={processorConfigPath}
        component={SuperSelectField}
        config={{ ...processorConfig, defaultValue: defaultOption }}
        componentProps={{
          euiFieldProps: {
            options,
          },
        }}
        readDefaultValueOnForm={readDefaultValueOnForm}
      />
    );
  }, [processorType, processorConfigPath, readDefaultValueOnForm, options, defaultOption]);

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
          onChange={onProcessorTypeChange}
          readDefaultValueOnForm={readDefaultValueOnForm}
        />
      </EuiFlexItem>
      <EuiFlexItem>{renderSelect()}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const processorNameConfig = {
  label: 'Name',
  validations: [{ validator: emptyField('A name is required.') }],
};

const ProcessorsConfigurator: FC<{ ruleType: string }> = ({ ruleType }) => {
  return (
    <UseArray
      key={ruleType}
      path={ruleType === 'type_one' ? 'typeOneProcessors' : 'typeTwoProcessors'}
      initialNumberOfItems={ruleType === 'type_one' ? 1 : 3}
    >
      {({ items, addItem, removeItem }) => {
        return (
          <>
            {items.map(({ id, path, isNew }) => {
              return (
                <EuiFlexGroup key={id} alignItems="center">
                  <EuiFlexItem grow={false}>
                    {/* Processor name */}
                    <UseField
                      path={`${path}.name`}
                      config={processorNameConfig}
                      component={TextField}
                      componentProps={{
                        euiFieldProps: {
                          style: {
                            maxWidth: '180px',
                          },
                        },
                      }}
                      readDefaultValueOnForm={!isNew}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {/* Processor type & config */}
                    <ProcessorTypeConfigurator basePath={path} readDefaultValueOnForm={!isNew} />
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
  const { updateFieldValues } = useFormContext();
  const [{ ruleType }] = useFormData({ watch: 'ruleType' });

  const onRuleTypeChange = useCallback(
    (updatedRuleType: string) => {
      if (!updatedRuleType) {
        return;
      }

      updateFieldValues({
        // Set dynamically the processors based on the "ruleType" selected.
        // In a real world scenario this would probably occur after fetching data on the server
        ruleType: updatedRuleType, // we need to provide the new ruleType for the deserializer
        processors: updatedRuleType === 'type_one' ? processorsTypeOne : processorsTypeTwo,
      });
    },
    [updateFieldValues]
  );

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
        onChange={onRuleTypeChange}
        componentProps={{
          euiFieldProps: {
            options: ruleTypeOptions,
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

interface MyForm {
  ruleType: string;
  processors: Array<{ name: string; type: string; config: string }>;
}

interface Processor {
  name: string;
  type: string;
  config: string;
}

interface MyFormInternal {
  ruleType: string;
  typeOneProcessors?: Processor[];
  typeTwoProcessors?: Processor[];
}

/**
 * Form defaultValue - Loaded from backend
 */
const defaultValue = {
  ruleType: 'type_two',
  processors: [
    { name: 'TypeTwoName1', type: 'value', config: 'value_config_3' },
    { name: 'TypeTwoName2', type: 'percentage', config: 'percentage_config_2' },
  ],
};

/** Form schema */
const schema = {
  ruleType: {
    label: 'Rule type',
    defaultValue: 'type_one',
  },
};

const deserializer = ({ ruleType, processors }: MyForm): MyFormInternal => {
  const formData: MyFormInternal = {
    ruleType,
  };

  if (ruleType === 'type_one') {
    formData.typeOneProcessors = processors;
  } else {
    formData.typeTwoProcessors = processors;
  }

  return formData;
};

const serializer = ({
  ruleType,
  typeOneProcessors,
  typeTwoProcessors,
}: MyFormInternal): MyForm => ({
  ruleType,
  processors: [...(typeOneProcessors ?? typeTwoProcessors!)],
});

const formConfig: FormConfig<MyForm, MyFormInternal> = {
  schema,
  defaultValue,
  deserializer,
  serializer,
};

export function DynamicData() {
  return (
    <FormWrapper formConfig={formConfig}>
      <FormContent />
    </FormWrapper>
  );
}

DynamicData.storyName = 'Dynamic data';
