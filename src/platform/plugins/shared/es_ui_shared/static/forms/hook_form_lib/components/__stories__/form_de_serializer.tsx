/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';

import { fieldFormatters } from '../../../helpers';
import { TextField, NumericField } from '../../../components';
import { useForm } from '../../hooks/use_form';
import { Form } from '../form';
import { UseField } from '../use_field';
import { FormArgs } from './types';
import { submitForm } from './form_utils';

interface MyForm {
  endPoint: string;
}

interface MyFormInternal {
  protocol: string;
  hostname: string;
  port?: number;
  pathname: string;
}

const deserializer = (formDefault: MyForm): MyFormInternal => {
  try {
    const url = new URL(formDefault.endPoint);
    const { protocol, hostname, pathname, port } = url;

    return {
      protocol,
      hostname,
      pathname,
      port: parseInt(port, 10),
    };
  } catch (e) {
    // Invalid URL
    return {
      protocol: '',
      hostname: '',
      pathname: '',
    };
  }
};

const serializer = ({ protocol, hostname, port, pathname }: MyFormInternal): MyForm => ({
  endPoint: `${protocol}//${hostname}:${port}${pathname === '/' ? '' : pathname}`,
});

type Args = FormArgs & { endPoint: string };

const FormWithDeSerializer = ({ endPoint, ...args }: Args) => {
  const { form } = useForm<MyForm, MyFormInternal>({
    serializer,
    deserializer,
    defaultValue: {
      endPoint,
    },
  });

  return (
    <Form form={form} {...args}>
      <UseField<string> path="protocol" component={TextField} config={{ label: 'Protocol' }} />
      <UseField<string> path="hostname" component={TextField} config={{ label: 'Host' }} />
      <UseField<number>
        path="port"
        component={NumericField}
        config={{ label: 'Port', formatters: [fieldFormatters.toInt] }}
      />
      <UseField<string> path="pathname" component={TextField} config={{ label: 'Pathname' }} />
      <EuiButton onClick={() => submitForm(form)}>Send</EuiButton>
    </Form>
  );
};

export const DeSerializer = (args: Args) => {
  // We add a "key" to force a refresh of the form each time the end point arg changes
  return <FormWithDeSerializer key={args.endPoint} {...args} />;
};

DeSerializer.storyName = '(De)serializer';

DeSerializer.argTypes = {
  endPoint: {
    name: 'formDefaultValue.endPoint',
    description:
      'This endpoint comes from the backend and is passed to the form. We want to split the URL and the port to let the user modify them separately. For that we will deserialize the field into 2 form fields. When sending the form we will serialize back the 2 fields into one.',
    defaultValue: 'https://elastic.co:9200',
    control: {
      type: 'text',
    },
  },
};

DeSerializer.parameters = {
  docs: {
    source: {
      code: `
interface MyForm {
  endPoint: string;
}

interface MyFormInternal {
  protocol: string;
  hostname: string;
  port?: number;
  pathname: string;
}

const deserializer = (formDefault: MyForm): MyFormInternal => {
  try {
    const url = new URL(formDefault.endPoint);
    const { protocol, hostname, pathname, port } = url;

    return {
      protocol,
      hostname,
      pathname,
      port: parseInt(port, 10),
    };
  } catch (e) {
    // Invalid URL
    return {
      protocol: '',
      hostname: '',
      pathname: '',
    };
  }
};

const serializer = ({ protocol, hostname, port, pathname }: MyFormInternal): MyForm => ({
  endPoint: \`\${protocol}//\${hostname}:\${port}\${pathname === '/' ? '' : pathname}\`,
});

const MyFormComponent = ({ endPoint }) => {
  const { form } = useForm<MyForm, MyFormInternal>({
    serializer,
    deserializer,
    defaultValue: {
      endPoint,
    },
  });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // ... do something with the data
    }
  };

  return (
    <Form form={form} {...args}>
      <UseField<string> path="protocol" component={TextField} config={{ label: 'Protocol' }} />
      <UseField<string> path="hostname" component={TextField} config={{ label: 'Host' }} />
      <UseField<number>
        path="port"
        component={NumericField}
        config={{ label: 'Port', formatters: [fieldFormatters.toInt] }}
      />
      <UseField<string> path="pathname" component={TextField} config={{ label: 'Pathname' }} />
      <EuiButton onClick={submitForm}>Send</EuiButton>
    </Form>
  );
};
      `,
      language: 'tsx',
    },
  },
};
