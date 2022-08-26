/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect } from 'react';
import { EuiSpacer, EuiDualRange, EuiText, EuiTextColor, EuiFormRow } from '@elastic/eui';
import { action } from '@storybook/addon-actions';

import { useFormData } from '../../hooks';
import { UseMultiFields } from '../use_multi_fields';

const fields = {
  min: {
    path: 'minValue',
    defaultValue: 0,
  },
  max: {
    path: 'maxValue',
    defaultValue: 100,
  },
};

export function Basic() {
  const [{ minValue: _min, maxValue: _max }] = useFormData();

  useEffect(() => {
    action('Min max values')([_min, _max]);
  }, [_min, _max]);

  return (
    <>
      <EuiText>
        <p>
          <EuiTextColor color="subdued">
            When you need to declare multiple fields you can use &quot;UseMultiFields&quot; to avoid
            nesting multiple &quot;UseField&quot;.
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer />

      <EuiFormRow
        label="Range"
        helpText="The <EuiDualRange /> component sets 2 values in the form."
      >
        <UseMultiFields<{ min: number; max: number }> fields={fields}>
          {({ min, max }) => {
            return (
              <EuiDualRange
                min={0}
                max={100}
                value={[min.value, max.value]}
                onChange={([minValue, maxValue]) => {
                  min.setValue(minValue as number);
                  max.setValue(maxValue as number);
                }}
              />
            );
          }}
        </UseMultiFields>
      </EuiFormRow>
    </>
  );
}

Basic.storyName = 'Basic';

Basic.parameters = {
  docs: {
    source: {
      code: `
const fields = {
  min: {
    path: 'minValue',
    defaultValue: 0,
  },
  max: {
    path: 'maxValue',
    defaultValue: 100,
  },
};

const MyFormComponent = () => {
  const { form } = useForm({ defaultValue });

  const [{ minValue: _min, maxValue: _max }] = useFormData();

  useEffect(() => {
    action('Min max values')([_min, _max]);
  }, [_min, _max]);

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
            When you need to declare multiple fields you can use &quot;UseMultiFields&quot; to avoid
            nesting multiple &quot;UseField&quot;.
          </EuiTextColor>
        </p>
      </EuiText>
      <EuiSpacer />

      <EuiFormRow
        label="Range"
        helpText="The <EuiDualRange /> component sets 2 values in the form."
      >
        <UseMultiFields<{ min: number; max: number }> fields={fields}>
          {({ min, max }) => {
            return (
              <EuiDualRange
                min={0}
                max={100}
                value={[min.value, max.value]}
                onChange={([minValue, maxValue]) => {
                  min.setValue(minValue as number);
                  max.setValue(maxValue as number);
                }}
              />
            );
          }}
        </UseMultiFields>
      </EuiFormRow>
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
