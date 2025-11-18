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
import { Form } from './form';

const meta = {
  title: 'Form Generator',
};

export default meta;

const submit = ({ data }: { data: unknown }) => {
  // eslint-disable-next-line no-console
  console.log(data);
  window.alert(JSON.stringify(data, null, 2));
};

export const WebhookConnector: StoryObj = {
  render: () => {
    return <Form connectorSchema={webhookConnectorFormSchema} onSubmit={submit} />;
  },
};

export const AbuseIPDBConnector: StoryObj = {
  render: () => {
    return <Form connectorSchema={abuseIPDBConnectorSchema} onSubmit={submit} />;
  },
};

export const AlienVaultOTXConnector: StoryObj = {
  render: () => {
    return <Form connectorSchema={alienVaultOTXConnectorSchema} onSubmit={submit} />;
  },
};

export const GreyNoiseConnector: StoryObj = {
  render: () => {
    return <Form connectorSchema={GreyNoiseConnectorSchema} onSubmit={submit} />;
  },
};

export const ShodanConnector: StoryObj = {
  render: () => {
    return <Form connectorSchema={ShodanConnectorSchema} onSubmit={submit} />;
  },
};

export const UrlVoidConnector: StoryObj = {
  render: () => {
    return <Form connectorSchema={UrlVoidConnectorSchema} onSubmit={submit} />;
  },
};

export const VirusTotalConnector: StoryObj = {
  render: () => {
    return <Form connectorSchema={VirusTotalConnectorSchema} onSubmit={submit} />;
  },
};

// this is not the object that would be created as SingleConnectorFile, this is the internal
// representation after parsing a SingleConnectorFile
const webhookConnectorFormSchema = z.object({
  name: z.string().min(1, { message: 'Name cannot be empty' }).meta({
    label: 'Connector Name',
  }),
  method: z.enum(['POST', 'PUT', 'GET', 'DELETE']).meta({
    label: 'Method',
    default: 'POST',
  }),
  url: z.url().meta({ widget: 'text', label: 'URL' }),
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
      default: 'basic',
    }),
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
  authType: z.discriminatedUnion('authType', [
    z.object({
      authType: z.literal('header'),
      'X-OTX-API-KEY': z.string().min(1, { message: 'API Key cannot be empty' }).meta({
        label: 'API Key',
        sensitive: true,
      }),
    }),
  ]),
});

const GreyNoiseConnectorSchema = z.object({
  authType: z.discriminatedUnion('type', [
    z
      .object({
        type: z.literal('apiKey'),
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
