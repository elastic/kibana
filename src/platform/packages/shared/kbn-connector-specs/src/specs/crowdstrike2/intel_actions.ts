/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { SCOPES } from './constants';
import { errorsOf, falconRequest, fqlQuote, nextAfter, resourcesOf } from './client';
import { intelVerdict } from './format';
import { awaitDetonation, submitToSandbox, uploadSample } from './sandbox';
import type {
  DetonateFileInput,
  DetonateUrlInput,
  GetFileReputationInput,
  GetUrlReputationInput,
  SpotlightSearchVulnerabilityInput,
} from './types';
import {
  DetonateFileInputSchema,
  DetonateUrlInputSchema,
  GetFileReputationInputSchema,
  GetUrlReputationInputSchema,
  SpotlightSearchVulnerabilityInputSchema,
} from './types';

const HASH_TYPES: Record<number, string> = { 32: 'hash_md5', 40: 'hash_sha1', 64: 'hash_sha256' };

/** Falcon Intelligence indicator lookup; a 404 means no record (verdict not_found). */
const intelLookup = async (ctx: ActionContext, indicator: string, type: string, limit = 10) => {
  const response = await falconRequest(ctx, {
    method: 'GET',
    path: '/intel/combined/indicators/v1',
    params: { filter: `indicator:${fqlQuote(indicator)}+type:${fqlQuote(type)}`, limit },
    retryServerErrors: true,
    allowNotFound: true,
    scope: SCOPES.intelRead,
  });
  const resources = response.status === 404 ? [] : resourcesOf(response.data);
  return { verdict: intelVerdict(resources), resources, meta: response.data?.meta };
};

const defaultTimeout = (timeout?: number) => timeout ?? 60;

export const intelActions: ConnectorSpec['actions'] = {
  getFileReputation: {
    isTool: true,
    scope: 'read',
    description:
      'Look up an MD5, SHA1 or SHA256 hash in Falcon Intelligence. Returns verdict, the highest malicious_confidence or not_found, and the matching indicators.',
    input: GetFileReputationInputSchema,
    handler: async (ctx, input: GetFileReputationInput) =>
      intelLookup(ctx, input.hash.toLowerCase(), HASH_TYPES[input.hash.length], input.limit),
  },
  getUrlReputation: {
    isTool: true,
    scope: 'read',
    description:
      'Look up a URL or domain in Falcon Intelligence. Returns verdict, the highest malicious_confidence or not_found, and the matching indicators.',
    input: GetUrlReputationInputSchema,
    handler: async (ctx, input: GetUrlReputationInput) => {
      const isUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(input.url);
      return intelLookup(
        ctx,
        isUrl ? input.url : input.url.toLowerCase(),
        isUrl ? 'url' : 'domain',
        input.limit
      );
    },
  },
  detonateUrl: {
    isTool: true,
    scope: 'write',
    description:
      'Detonate a URL in Falcon Sandbox. Returns verdict and threat_score; when complete is false, call again with submission_id.',
    input: DetonateUrlInputSchema,
    handler: async (ctx, input: DetonateUrlInput) => {
      const submissionId =
        input.submission_id ??
        (await submitToSandbox(ctx, { url: input.url ?? '' }, input, SCOPES.sandboxWrite));
      return awaitDetonation(ctx, submissionId, defaultTimeout(input.timeout), SCOPES.sandboxWrite);
    },
  },
  detonateFile: {
    isTool: true,
    scope: 'write',
    description:
      'Detonate a file in Falcon Sandbox: content_base64 with file_name, up to 1 MiB, or the sha256 of a sample in Falcon. When complete is false, call again with submission_id.',
    input: DetonateFileInputSchema,
    handler: async (ctx, input: DetonateFileInput) => {
      let submissionId = input.submission_id;
      let sha256 = input.sha256?.toLowerCase();
      if (!submissionId) {
        if (input.content_base64 !== undefined) {
          sha256 = await uploadSample(
            ctx,
            input.content_base64,
            input.file_name ?? 'sample',
            SCOPES.sandboxSampleWrite
          );
        }
        submissionId = await submitToSandbox(
          ctx,
          { sha256: sha256 ?? '' },
          input,
          SCOPES.sandboxWrite
        );
      }
      const result = await awaitDetonation(
        ctx,
        submissionId,
        defaultTimeout(input.timeout),
        SCOPES.sandboxWrite
      );
      return { ...result, sha256: result.sha256 ?? sha256 };
    },
  },
  spotlightSearchVulnerability: {
    isTool: true,
    scope: 'read',
    description:
      "Search Spotlight vulnerabilities by FQL, for example aid:'<device id>'+status:'open'. Returns one page and next_after.",
    input: SpotlightSearchVulnerabilityInputSchema,
    handler: async (ctx, input: SpotlightSearchVulnerabilityInput) => {
      const response = await falconRequest(ctx, {
        method: 'GET',
        path: '/spotlight/combined/vulnerabilities/v1',
        params: {
          filter: input.filter,
          limit: input.limit,
          after: input.after,
          facet: input.facet,
          sort: input.sort,
        },
        retryServerErrors: true,
        allowNotFound: true,
        scope: SCOPES.spotlightRead,
      });
      const resources = response.status === 404 ? [] : resourcesOf(response.data);
      return {
        resources,
        meta: response.data?.meta,
        errors: errorsOf(response.data),
        next_after: nextAfter(response.data, resources.length),
      };
    },
  },
};
