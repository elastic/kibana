/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDefinition } from '../../connector_spec';
import { graphRequest } from './client';
import { GetThreatIntelHostInputSchema, GetWhoisRecordInputSchema } from './types';
import type { GetThreatIntelHostInput, GetWhoisRecordInput } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const threatIntelActions: Record<string, ActionDefinition<any, any, any>> = {
  getThreatIntelHost: {
    isTool: true,
    scope: 'read',
    description:
      'Retrieve Microsoft Defender Threat Intelligence (MDTI) data for a hostname or IP address — ' +
      'including associated threat actors, malware families, infrastructure relationships, and first/last seen dates. ' +
      'Requires the ThreatIntelligence.Read.All Graph permission.',
    input: GetThreatIntelHostInputSchema,
    handler: async (ctx, input: GetThreatIntelHostInput) =>
      graphRequest(
        ctx,
        'get',
        `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}`,
        'getThreatIntelHost'
      ),
  },

  getThreatIntelHostReputation: {
    isTool: true,
    scope: 'read',
    description:
      'Get the Microsoft Defender Threat Intelligence reputation score and classification for a hostname or IP address. ' +
      'Returns a score (0–100, higher = more malicious), a classification (malicious/suspicious/neutral/benign), ' +
      'and the rules that influenced the score. ' +
      'Requires the ThreatIntelligence.Read.All Graph permission.',
    input: GetThreatIntelHostInputSchema,
    handler: async (ctx, input: GetThreatIntelHostInput) =>
      graphRequest(
        ctx,
        'get',
        `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/reputation`,
        'getThreatIntelHostReputation'
      ),
  },

  getPassiveDnsRecords: {
    isTool: true,
    scope: 'read',
    description:
      'Retrieve forward passive DNS records for a hostname from Microsoft Defender Threat Intelligence. ' +
      'Returns historical DNS resolution data showing what IPs a domain resolved to. ' +
      'Use to pivot across attacker infrastructure during threat hunting or attribution investigations. ' +
      'Requires the ThreatIntelligence.Read.All Graph permission.',
    input: GetThreatIntelHostInputSchema,
    handler: async (ctx, input: GetThreatIntelHostInput) => {
      const data = await graphRequest(
        ctx,
        'get',
        `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/passivedns`,
        'getPassiveDnsRecords'
      );
      return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
    },
  },

  getWhoisRecord: {
    isTool: true,
    scope: 'read',
    description:
      'Retrieve WHOIS registration data for a domain from Microsoft Defender Threat Intelligence. ' +
      'Returns registrar, registrant contact details, name servers, registration and expiry dates, and abuse contact. ' +
      'Use to attribute domains to known threat actors or identify recently registered infrastructure. ' +
      'Requires the ThreatIntelligence.Read.All Graph permission.',
    input: GetWhoisRecordInputSchema,
    handler: async (ctx, input: GetWhoisRecordInput) =>
      graphRequest(
        ctx,
        'get',
        `/security/threatIntelligence/hosts/${encodeURIComponent(input.host)}/whois`,
        'getWhoisRecord'
      ),
  },
};
