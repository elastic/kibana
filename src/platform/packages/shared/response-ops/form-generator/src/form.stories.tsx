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
import { withUIMeta } from './connector_spec_ui';

// this is not the object that would be created as SingleConnectorFile, this is the internal
// representation after parsing a SingleConnectorFile
const webhookConnectorFormSchema = z.object({
  name: withUIMeta(z.string().min(1, { message: 'Name cannot be empty' }), {
    widget: 'text',
    widgetOptions: { label: 'Connector Name' },
  }),
  method: withUIMeta(z.enum(['POST', 'PUT', 'GET', 'DELETE']), {
    widget: 'select',
    widgetOptions: { label: 'Method', default: 'POST' },
  }),
  url: withUIMeta(z.url(), { widget: 'text', widgetOptions: { label: 'URL' } }),
  authType: withUIMeta(
    z.discriminatedUnion('type', [
      withUIMeta(z.object({ type: z.literal('none') }), {
        widgetOptions: { label: 'None' },
      }),
      withUIMeta(
        z.object({
          type: z.literal('basic'),
          username: withUIMeta(z.string().min(1, { message: 'Username cannot be empty' }), {
            widget: 'text',
            widgetOptions: { label: 'Username' },
          }),
          password: withUIMeta(z.string().min(1, { message: 'Password cannot be empty' }), {
            widget: 'password',
            widgetOptions: { label: 'Password' },
          }),
        }),
        { widgetOptions: { label: 'Basic Authentication' } }
      ),
      withUIMeta(
        z.object({
          type: z.literal('bearer'),
          token: withUIMeta(z.string().min(1, { message: 'Token cannot be empty' }), {
            widget: 'password',
            widgetOptions: { label: 'Token' },
          }),
        }),
        { widgetOptions: { label: 'Bearer Token' } }
      ),
    ]),
    {
      widget: 'formFieldset',
      widgetOptions: { label: 'Authentication', default: 'basic' },
    }
  ),
});

const meta = {
  title: 'Form Generator',
};

export default meta;

const DefaultStory = () => {
  return (
    <Form
      connectorSchema={webhookConnectorFormSchema}
      onSubmit={({ data }) => window.alert(JSON.stringify(data))}
    />
  );
};

export const WebhookConnector: StoryObj<typeof DefaultStory> = {
  argTypes: {
    connectorSchema: {
      control: false,
      description: 'Controls the schema',
    },
  },
  render: DefaultStory,
};
