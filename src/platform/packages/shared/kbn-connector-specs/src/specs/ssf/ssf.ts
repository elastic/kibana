/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { v4 as uuidv4 } from 'uuid';
import type { ConnectorSpec } from '../../connector_spec';

const MAX_EVENTS = 10;

const inputSchema = z.object({
  audience: z
    .string()
    .min(1)
    .max(2048)
    .describe('Value of the `aud` claim. The receiver defines it.'),
  events: z
    .record(z.url().max(2048), z.record(z.string().max(256), z.unknown()))
    .refine((events) => {
      const count = Object.keys(events).length;
      return count >= 1 && count <= MAX_EVENTS;
    }, `Give 1 to ${MAX_EVENTS} events.`)
    .describe(
      'Value of the `events` claim: event type URIs and their payloads. Give one event. SSF 1.0 permits more URIs only as alternative URIs for the same event type.'
    ),
  subId: z
    .looseObject({
      format: z.string().min(1).max(64).describe('Subject identifier format, for example `email`.'),
    })
    .describe('Value of the `sub_id` claim (an RFC 9493 subject identifier). SSF 1.0 requires it.'),
  txn: z.string().min(1).max(256).optional().describe('Optional value of the `txn` claim.'),
});

export const SSF: ConnectorSpec = {
  metadata: {
    id: '.ssf',
    displayName: 'Shared Signals (SSF)',
    description: i18n.translate('connectorSpecs.ssf.description', {
      defaultMessage:
        'Sign Security Event Tokens with a key that Kibana manages, and publish the public key for SSF receivers.',
    }),
    docsUrl: '',
    minimumLicense: 'gold',
    isTechnicalPreview: true,
    supportsPublicKeys: true,
    supportedFeatureIds: ['workflows'],
    icon: 'key',
  },
  auth: { types: ['none'] },
  actions: {
    signSet: {
      description:
        'Sign a Security Event Token (SET). The action does not check all SSF 1.0 rules. Send the returned token to the receiver with an HTTP request, and check for HTTP 202.',
      isTool: false,
      scope: 'write',
      input: inputSchema,
      handler: async (ctx, input: z.infer<typeof inputSchema>) => {
        if (!ctx.signJwt) throw new Error('The connector has no signing key.');
        const jti = uuidv4();
        const set = await ctx.signJwt({
          aud: input.audience,
          jti,
          iat: Math.floor(Date.now() / 1000),
          events: input.events,
          sub_id: input.subId,
          ...(input.txn ? { txn: input.txn } : {}),
        });
        return { set, jti };
      },
    },
  },
  test: { enabled: false, handler: async () => ({}) },
};
