/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { action } from '@storybook/addon-actions';
import { EuiText, EuiTextColor, EuiSpacer } from '@elastic/eui';

import { TextField } from '../../../components';
import { useFormData } from '../../hooks/use_form_data';
import { UseField } from '../use_field';

/**
 * This Story outputs the order in which different state update
 * and events occur whenever a field value changes.
 */
export const ChangeListeners = () => {
  const onUseFormDataChange = ({ title }: { title: string }) => {
    action('1. useFormData() -> onChange() handler')(title);
  };
  const [{ title }] = useFormData({ watch: 'title', onChange: onUseFormDataChange });

  const onFieldChangeProp = (value: string) => {
    action('2. onChange() prop handler')(value);
  };

  useEffect(() => {
    action('4. useEffect() "title" changed')(title);
    action('')('----------------------------------');
  }, [title]);

  return (
    <>
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            Info: start writing in the field and see the order of change listeners appear in the
            &quot;Actions&quot; panel below.
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer />
      <UseField<string>
        path="title"
        component={TextField}
        config={{
          label: 'Title',
          helpText: 'This is a help text for the field.',
          validations: [
            {
              validator: ({ value }) => {
                action('3. Validating "title" field')(value);
              },
            },
          ],
        }}
        onChange={onFieldChangeProp}
      />
    </>
  );
};

ChangeListeners.storyName = 'ChangeListeners';

ChangeListeners.parameters = {
  docs: {
    source: {
      code: `
const MyFormComponent = () => {
  const { form } = useForm({ defaultValue });

  const onUseFormDataChange = ({ title }: { title: string }) => {
    action('1. useFormData() -> onChange() handler')(title);
  };
  const [{ title }] = useFormData({ watch: 'title', onChange: onUseFormDataChange });

  const onFieldChangeProp = (value: string) => {
    action('2. onChange() prop handler')(value);
  };

  useEffect(() => {
    action('4. useEffect() "title" changed')(title);
    action('')('----------------------------------');
  }, [title]);

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            Info: start writing in the field and see the order of change listeners appear in the
            &quot;Actions&quot; panel below.
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer />
      <UseField<string>
        path="title"
        component={TextField}
        config={{
          label: 'Title',
          helpText: 'This is a help text for the field.',
          validations: [
            {
              validator: ({ value }) => {
                action('3. Validating "title" field')(value);
              },
            },
          ],
        }}
        onChange={onFieldChangeProp}
      />
      <EuiSpacer />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};
