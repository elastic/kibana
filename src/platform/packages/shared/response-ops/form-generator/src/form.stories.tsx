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

// this is not the object that would be created as SingleConnectorFile, this is the internal
// representation after parsing a SingleConnectorFile
const webhookConnectorFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name cannot be empty' })
    .meta({
      widget: 'text',
      widgetOptions: { label: 'Connector Name' },
    }),
  method: z.enum(['POST', 'PUT', 'GET', 'DELETE']).meta({
    widget: 'select',
    widgetOptions: { label: 'Method', default: 'POST' },
  }),
  url: z.url().meta({ widget: 'text', widgetOptions: { label: 'URL' } }),
  authType: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('none') }).meta({
        widgetOptions: { label: 'None' },
      }),
      z
        .object({
          type: z.literal('basic'),
          username: z
            .string()
            .min(1, { message: 'Username cannot be empty' })
            .meta({
              widget: 'text',
              widgetOptions: { label: 'Username' },
            }),
          password: z
            .string()
            .min(1, { message: 'Password cannot be empty' })
            .meta({
              widget: 'password',
              widgetOptions: { label: 'Password' },
            }),
        })
        .meta({ widgetOptions: { label: 'Basic Authentication' } }),
      z
        .object({
          type: z.literal('bearer'),
          token: z
            .string()
            .min(1, { message: 'Token cannot be empty' })
            .meta({
              widget: 'password',
              widgetOptions: { label: 'Token' },
            }),
        })
        .meta({ widgetOptions: { label: 'Bearer Token' } }),
      z
        .object({
          type: z.literal('headers'),
          headers: z.record(z.string(), z.string()).meta({
            widget: 'keyValue',
            widgetOptions: {
              label: 'Headers',
            },
          }),
        })
        .meta({
          widgetOptions: { label: 'Headers' },
        }),
    ])
    .meta({
      widget: 'formFieldset',
      widgetOptions: { label: 'Authentication', default: 'basic' },
    }),
});

const abuseIPDBConnectorSchema = z.object({
  authType: z
    .discriminatedUnion('type', [
      z
        .object({
          type: z.literal('apiKey'), // this literal is irrelevant
          Key: z
            .string()
            .min(1, { message: 'API Key cannot be empty' })
            .meta({
              widget: 'password',
              widgetOptions: {
                label: 'API Key',
                placeholder: 'Your AbuseIPDB API Key',
              },
            }),
        })
        .meta({
          widgetOptions: { label: 'Headers' },
        }),
    ])
    .meta({ widget: 'formFieldset', widgetOptions: { label: 'Authentication' } }),
});
