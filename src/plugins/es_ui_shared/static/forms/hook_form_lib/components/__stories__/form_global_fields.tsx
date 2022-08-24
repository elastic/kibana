/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useState, useContext, createContext } from 'react';
import { EuiSpacer, EuiText, EuiTextColor, EuiButton } from '@elastic/eui';

import { TextField, NumericField } from '../../../components';
import { FieldHook } from '../../types';
import { useForm } from '../../hooks';
import { Form } from '../form';
import { UseMultiFields } from '../use_multi_fields';
import { submitForm } from './form_utils';

// map of field ids to "<UseField />" props
const globalFields = {
  fieldA: {
    path: 'fieldA',
    defaultValue: 'foo',
    config: {
      label: 'Field A',
    },
  },
  fieldB: {
    path: 'fieldB',
    defaultValue: 123,
    config: {
      label: 'Field B',
    },
  },
};

const FormGlobalFieldsContext = createContext(
  {} as {
    fieldA: FieldHook<string>;
    fieldB: FieldHook<number>;
  }
);

const useGlobalFields = () => {
  const ctx = useContext(FormGlobalFieldsContext);
  if (!ctx) {
    throw new Error('Missing provider');
  }
  return ctx;
};

const FormGlobalFields: React.FC = ({ children }) => {
  return (
    <UseMultiFields fields={globalFields}>
      {(fields) => {
        return (
          <FormGlobalFieldsContext.Provider value={fields}>
            {children}
          </FormGlobalFieldsContext.Provider>
        );
      }}
    </UseMultiFields>
  );
};

const FormFields = () => {
  const { fieldA, fieldB } = useGlobalFields();

  return (
    <>
      <TextField field={fieldA as FieldHook<unknown>} />
      <NumericField field={fieldB as FieldHook<unknown>} />
    </>
  );
};

export function GlobalFields() {
  const { form } = useForm();
  const [areFieldsVisible, setAreFieldsVisible] = useState(true);
  const [areGlobalPresent, setAreGlobalPresent] = useState(true);

  return (
    <Form form={form}>
      {areGlobalPresent && (
        <FormGlobalFields>
          <EuiText>
            <p>
              <EuiTextColor color="subdued">
                You might need to have global fields in you form that persist their value event when
                a field unmounts. The recommended pattern is to use a React context along with
                &quot;UseMultiFields&quot;
              </EuiTextColor>
            </p>
          </EuiText>

          <EuiSpacer />

          {areFieldsVisible && <FormFields />}

          <EuiButton onClick={() => setAreFieldsVisible((prev) => !prev)}>
            Toggle fields in DOM
          </EuiButton>
          <EuiText size="s">
            <p>
              <EuiTextColor color="subdued">
                Removing fields from DOM (that are connected to globals) will still preserve their
                value in the form.
              </EuiTextColor>
            </p>
          </EuiText>
        </FormGlobalFields>
      )}
      <div>
        <EuiSpacer />
        <EuiButton onClick={() => setAreGlobalPresent((prev) => !prev)}>
          Toggle globals fields
        </EuiButton>
        <EuiText size="s">
          <p>
            <EuiTextColor color="subdued">
              Removing the global fields from DOM remove their value when sending the form.
            </EuiTextColor>
          </p>
        </EuiText>
      </div>

      <div>
        <EuiSpacer />
        <EuiButton onClick={() => submitForm(form)}>Send form</EuiButton>
      </div>
    </Form>
  );
}

GlobalFields.storyName = 'GlobalFields';

GlobalFields.parameters = {
  docs: {
    source: {
      code: `
// map of field ids to "<UseField />" props
const globalFields = {
  fieldA: {
    path: 'fieldA',
    defaultValue: 'foo',
    config: {
      label: 'Field A',
    },
  },
  fieldB: {
    path: 'fieldB',
    defaultValue: 123,
    config: {
      label: 'Field B',
    },
  },
};

const FormGlobalFieldsContext = createContext(
  {} as {
    fieldA: FieldHook<string>;
    fieldB: FieldHook<number>;
  }
);

const useGlobalFields = () => {
  const ctx = useContext(FormGlobalFieldsContext);
  if (!ctx) {
    throw new Error('Missing provider');
  }
  return ctx;
};

const FormGlobalFields: React.FC = ({ children }) => {
  return (
    <UseMultiFields fields={globalFields}>
      {(fields) => {
        return (
          <FormGlobalFieldsContext.Provider value={fields}>
            {children}
          </FormGlobalFieldsContext.Provider>
        );
      }}
    </UseMultiFields>
  );
};

const FormFields = () => {
  const { fieldA, fieldB } = useGlobalFields();

  return (
    <>
      <TextField field={fieldA} />
      <NumericField field={fieldB} />
    </>
  );
};

const MyFormComponent = () => {
  const { form } = useForm();
  const [areFieldsVisible, setAreFieldsVisible] = useState(true);
  const [areGlobalPresent, setAreGlobalPresent] = useState(true);

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form}>
      {areGlobalPresent && (
        <FormGlobalFields>
          <EuiText>
            <p>
              <EuiTextColor color="subdued">
                You might need to have global fields in you form that persist their value event when
                a field unmounts. The recommended pattern is to use a React context along with
                &quot;UseMultiFields&quot;
              </EuiTextColor>
            </p>
          </EuiText>

          <EuiSpacer />

          {areFieldsVisible && <FormFields />}

          <EuiButton onClick={() => setAreFieldsVisible((prev) => !prev)}>
            Toggle fields in DOM
          </EuiButton>
          <EuiText size="s">
            <p>
              <EuiTextColor color="subdued">
                Removing fields from DOM (that are connected to globals) will still preserve their
                value in the form.
              </EuiTextColor>
            </p>
          </EuiText>
        </FormGlobalFields>
      )}
      <div>
        <EuiSpacer />
        <EuiButton onClick={() => setAreGlobalPresent((prev) => !prev)}>
          Toggle globals fields
        </EuiButton>
        <EuiText size="s">
          <p>
            <EuiTextColor color="subdued">
              Removing the global fields from DOM remove their value when sending the form.
            </EuiTextColor>
          </p>
        </EuiText>
      </div>

      <div>
        <EuiSpacer />
        <EuiButton onClick={submitForm}>Send form</EuiButton>
      </div>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};
