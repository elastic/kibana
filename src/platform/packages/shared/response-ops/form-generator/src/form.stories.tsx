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

const webhookConnectorFormSchema = z.object({
  name: withUIMeta(z.string().min(1, { message: 'Name cannot be empty' }), {
    widget: 'text',
    widgetOptions: { label: 'Connector Name', defaultValue: 'My Webhook' },
  }),
  method: withUIMeta(z.enum(['post', 'put', 'get', 'delete']).default('post'), {
    widget: 'select',
    widgetOptions: { label: 'Method' },
  }),
  // url: withUIMeta(z.url(), { widget: 'text', widgetOptions: { label: 'URL' } }),
  // authType: withUIMeta(
  //   z.discriminatedUnion('type', [
  //     z.object({
  //       type: z.literal('none'),
  //     }),
  //     z.object({
  //       type: z.literal('basic'),
  //       username: z.string(),
  //       password: z.string(),
  //     }),
  //     z.object({
  //       type: z.literal('ssl'),
  //       password: z.string(),
  //       authType: z.discriminatedUnion('type', [
  //         z.object({
  //           type: z.literal('crt_key'),
  //           crtFile: z.string().meta({
  //             widget: 'fileUpload',
  //             widgetOptions: { accept: '.crt,.cert,.cer,.pem', label: 'CRT File' },
  //           }),
  //           keyFile: z.string().meta({
  //             widget: 'fileUpload',
  //             widgetOptions: { accept: '.key,.pem', label: 'KEY File' },
  //           }),
  //         }),
  //         z.object({
  //           type: z.literal('pfx'),
  //           keyFile: z.string().meta({
  //             widget: 'fileUpload',
  //             widgetOptions: { accept: '.pfx,.p12', label: 'PFX File' },
  //           }),
  //         }),
  //       ]),
  //     }),
  //   ]),
  //   { widget: 'card', widtgetOptions: { label: 'Authentication' } }
  // ),
});

const meta = {
  title: 'Form Generator',
};

export default meta;

const DefaultStory = ({ connectorSchema }: { connectorSchema?: z.ZodObject }) => {
  if (!connectorSchema) {
    return <div>No schema provided</div>;
  }
  return <Form connectorSchema={connectorSchema} />;
};

export const WebhookConnector: StoryObj<typeof DefaultStory> = {
  args: {
    connectorSchema: webhookConnectorFormSchema,
  },
  argTypes: {
    connectorSchema: {
      control: false,
      description: 'Controls the schema',
    },
  },
  render: DefaultStory,
};
