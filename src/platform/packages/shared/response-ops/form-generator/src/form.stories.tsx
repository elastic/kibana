/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { StoryObj } from '@storybook/react';
import { z } from '@kbn/zod/v4';
import { EuiButton } from '@elastic/eui';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormGenerator } from './form';

const meta = {
  title: 'Form Generator',
};

export default meta;

const submit = ({ data }: { data: unknown }) => {
  // eslint-disable-next-line no-console
  console.log(data);
  window.alert(JSON.stringify(data, null, 2));
};

interface FormWrapperProps {
  schema: z.ZodObject<z.ZodRawShape>;
  onSubmit: (data: { data: unknown }) => void;
}

const FormWrapper = ({ schema, onSubmit }: FormWrapperProps) => {
  const { form } = useForm({
    onSubmit: async (data, isValid) => {
      if (isValid) {
        onSubmit({ data });
      }
    },
  });

  return (
    <Form form={form}>
      <FormGenerator schema={schema} />
      <EuiButton onClick={form.submit} isLoading={form.isSubmitting}>
        Submit
      </EuiButton>
    </Form>
  );
};

export const WebhookConnector: StoryObj = {
  render: () => {
    return <FormWrapper schema={webhookConnectorFormSchema} onSubmit={submit} />;
  },
};

export const AbuseIPDBConnector: StoryObj = {
  render: () => {
    return <FormWrapper schema={abuseIPDBConnectorSchema} onSubmit={submit} />;
  },
};

export const AlienVaultOTXConnector: StoryObj = {
  render: () => {
    return <FormWrapper schema={alienVaultOTXConnectorSchema} onSubmit={submit} />;
  },
};

export const GreyNoiseConnector: StoryObj = {
  render: () => {
    return <FormWrapper schema={GreyNoiseConnectorSchema} onSubmit={submit} />;
  },
};

export const ShodanConnector: StoryObj = {
  render: () => {
    return <FormWrapper schema={ShodanConnectorSchema} onSubmit={submit} />;
  },
};

export const UrlVoidConnector: StoryObj = {
  render: () => {
    return <FormWrapper schema={UrlVoidConnectorSchema} onSubmit={submit} />;
  },
};

export const VirusTotalConnector: StoryObj = {
  render: () => {
    return <FormWrapper schema={VirusTotalConnectorSchema} onSubmit={submit} />;
  },
};

const webhookConnectorFormSchema = z.object({
  method: z.enum(['POST', 'PUT', 'GET', 'DELETE']).meta({
    label: 'Method',
  }),
  url: z.url().meta({ widget: 'text', label: 'URL', placeholder: 'https://...' }),
  authType: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('none') }).meta({
        label: 'None',
      }),
      z
        .object({
          type: z.literal('basic'),
          username: z.string().min(1, { message: 'Username cannot be empty' }).meta({
            label: 'Username',
          }),
          password: z.string().min(1, { message: 'Password cannot be empty' }).meta({
            label: 'Password',
            sensitive: true,
          }),
        })
        .meta({ label: 'Basic Authentication' }),
      z
        .object({
          type: z.literal('bearer'),
          token: z.string().min(1, { message: 'Token cannot be empty' }).meta({
            label: 'Token',
          }),
        })
        .meta({ label: 'Bearer Token' }),
    ])
    .meta({
      label: 'Authentication',
    })
    .default({ type: 'basic', username: '', password: '' }),
});

const abuseIPDBConnectorSchema = z.object({
  authType: z.discriminatedUnion('type', [
    z
      .object({
        type: z.literal('apiKey'),
        Key: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
          placeholder: 'Your AbuseIPDB API Key',
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const alienVaultOTXConnectorSchema = z.object({
  authType: z.discriminatedUnion('authTypes', [
    z.object({
      authTypes: z.literal('api_key_header'),
      'X-OTX-API-KEY': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
        label: 'API Key',
        sensitive: true,
        placeholder: 'Your AlienVault OTX API Key',
      }),
    }),
  ]),
});

const GreyNoiseConnectorSchema = z.object({
  authType: z.discriminatedUnion('authTypes', [
    z
      .object({
        authTypes: z.literal('apiKey'),
        key: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const ShodanConnectorSchema = z.object({
  authType: z.discriminatedUnion('type', [
    z
      .object({
        type: z.literal('apiKey'),
        'X-Api-Key': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const UrlVoidConnectorSchema = z.object({
  authType: z.discriminatedUnion('type', [
    z
      .object({
        type: z.literal('apiKey'),
        'X-Api-Key': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
        }),
      })
      .meta({
        label: 'Headers',
      }),
  ]),
});

const VirusTotalConnectorSchema = z.object({
  authType: z
    .discriminatedUnion('type', [
      z
        .object({
          type: z.literal('apiKey'),
          'x-apikey': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
            widget: 'password',
            label: 'API Key',
            placeholder: 'vt-...',
          }),
        })
        .meta({
          label: 'Headers',
        }),
    ])
    .meta({ widget: 'formFieldset', label: 'Authentication' }),
});
