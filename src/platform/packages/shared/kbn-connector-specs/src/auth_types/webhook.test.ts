/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import type { AuthContext } from '../connector_spec';
import { WebhookAuth } from './webhook';

describe('WebhookAuth', () => {
  it('validates and marks the webhook URL as sensitive', () => {
    expect(
      WebhookAuth.schema.parse({ webhookUrl: 'https://hooks.slack.com/services/test' })
    ).toEqual({ webhookUrl: 'https://hooks.slack.com/services/test' });
    expect(WebhookAuth.schema.shape.webhookUrl.meta()).toMatchObject({
      sensitive: true,
      validate: { allowedHosts: true },
    });
  });

  it('does not add authorization headers', async () => {
    const axiosInstance = axios.create();

    const configured = await WebhookAuth.configure({} as AuthContext, axiosInstance, {
      webhookUrl: 'https://hooks.slack.com/services/test',
    });

    expect(configured).toBe(axiosInstance);
    expect(configured.defaults.headers.common.Authorization).toBeUndefined();
  });
});
