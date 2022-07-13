/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { TextField } from '../../../components';
import { fieldValidators } from '../../../helpers';
import { FormConfig } from '../../types';
import { UseField } from '../use_field';
import { UseArray } from '../use_array';
import { FormWrapper } from './form_utils';

const { emptyField } = fieldValidators;

const defaultValue = {
  employees: [
    {
      name: 'John',
      lastName: 'Snow',
    },
  ],
};

const formConfig: FormConfig = {
  defaultValue,
};

export function Basic() {
  return (
    <FormWrapper formConfig={formConfig}>
      <>
        <EuiTitle>
          <h2>Employees</h2>
        </EuiTitle>
        <EuiSpacer />
        <UseArray path="employees">
          {({ items, addItem, removeItem }) => {
            return (
              <>
                {items.map(({ id, path }) => {
                  return (
                    <EuiFlexGroup key={id} alignItems="center">
                      <EuiFlexItem>
                        <UseField
                          path={`${path}.name`}
                          config={{
                            label: 'Name',
                            validations: [{ validator: emptyField('A name is required.') }],
                          }}
                          component={TextField}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <UseField
                          path={`${path}.lastName`}
                          config={{
                            label: 'Last name',
                            validations: [{ validator: emptyField('A last name is required.') }],
                          }}
                          component={TextField}
                        />
                      </EuiFlexItem>
                      {items.length > 1 && (
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            iconType="minusInCircle"
                            onClick={() => removeItem(id)}
                            aria-label="Remove item"
                          />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  );
                })}
                <EuiSpacer size="m" />
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiButtonEmpty onClick={addItem}>Add employee</EuiButtonEmpty>
                </EuiFlexGroup>
              </>
            );
          }}
        </UseArray>
      </>
    </FormWrapper>
  );
}

Basic.storyName = 'Basic';

Basic.parameters = {
  docs: {
    source: {
      code: `
const defaultValue = {
  employees: [
    {
      name: 'John',
      lastName: 'Snow',
    },
  ],
};

const MyFormComponent = () => {
  const { form } = useForm({ defaultValue });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      <EuiTitle>
        <h2>Employees</h2>
      </EuiTitle>
      <EuiSpacer />
      <UseArray path="employees">
        {({ items, addItem, removeItem }) => {
          return (
            <>
              {items.map(({ id, path }) => {
                return (
                  <EuiFlexGroup key={id} alignItems="center">
                    <EuiFlexItem>
                      <UseField
                        path={\`\${path}.name\`}
                        config={{
                          label: 'Name',
                          validations: [{ validator: emptyField('A name is required.') }],
                        }}
                        component={TextField}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <UseField
                        path={\`\${path}.lastName\`}
                        config={{
                          label: 'Last name',
                          validations: [{ validator: emptyField('A last name is required.') }],
                        }}
                        component={TextField}
                      />
                    </EuiFlexItem>
                    {items.length > 1 && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="minusInCircle"
                          onClick={() => removeItem(id)}
                          aria-label="Remove item"
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                );
              })}
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiButtonEmpty onClick={addItem}>Add employee</EuiButtonEmpty>
              </EuiFlexGroup>
            </>
          );
        }}
      </UseArray>
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
