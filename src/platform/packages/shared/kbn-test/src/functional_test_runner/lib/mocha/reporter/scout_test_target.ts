/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';
import type { ScoutTargetDomain } from '@kbn/scout-info';
import { ScoutTestTarget } from '@kbn/scout-info';
import type { Config as FTRConfig } from '../../config';

export const SERVERLESS_DOMAINS: Readonly<Record<string, ScoutTargetDomain>> = {
  es: 'search',
  'oblt:complete': 'observability_complete',
  'oblt:logs_essentials': 'observability_logs_essentials',
  'security:complete': 'security_complete',
  'security:essentials': 'security_essentials',
  'security:search_ai_lake': 'security_ease',
  vectordb: 'vectordb',
};

// Kibana keeps the last value when a setting is passed more than once
const getStringOption = (options: getopts.ParsedOptions, name: string): string | undefined => {
  const value: unknown = [options[name]].flat().at(-1);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const parseJsonArray = <T>(value: string | undefined): T[] => {
  try {
    const parsed: unknown = JSON.parse(value ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getProductTier = (
  options: getopts.ParsedOptions,
  projectType: string
): string | undefined => {
  if (projectType === 'security') {
    const productTypes = parseJsonArray<{ product_line?: string; product_tier?: string }>(
      getStringOption(options, 'xpack.securitySolutionServerless.productTypes')
    );
    const entry =
      productTypes.find(({ product_line: productLine }) => productLine === 'security') ??
      productTypes[0];
    return entry?.product_tier ?? 'complete';
  }

  if (projectType === 'oblt') {
    const products = parseJsonArray<{ name?: string; tier?: string }>(
      getStringOption(options, 'pricing.tiers.products')
    );
    return products.find(({ name }) => name === 'observability')?.tier ?? 'complete';
  }

  return undefined;
};

/**
 * Resolves the Scout test target domain of the deployment an FTR config starts, from the
 * `--serverless` project type and the security or oblt product tier Kibana is started with.
 */
export const getScoutTargetDomain = (config: FTRConfig): ScoutTargetDomain | undefined => {
  if (!config.get('serverless')) {
    return 'classic';
  }

  const options = getopts(config.get('kbnTestServer.serverArgs', []));
  const projectType = getStringOption(options, 'serverless');
  if (projectType === undefined) {
    return undefined;
  }

  const tier = getProductTier(options, projectType);
  return SERVERLESS_DOMAINS[tier === undefined ? projectType : `${projectType}:${tier}`];
};

/**
 * Resolves the Scout test target of an FTR run, preferring the `SCOUT_TARGET_*` environment
 * variables and otherwise deriving it from the resolved FTR config.
 */
export const getScoutTestTarget = (config: FTRConfig): { type: string; mode: string } => {
  const envTarget = ScoutTestTarget.tryFromEnv();
  if (envTarget) {
    return { type: envTarget.location, mode: envTarget.tagWithoutLocation };
  }

  const location = process.env.TEST_CLOUD ? 'cloud' : 'local';
  const arch = config.get('serverless') ? 'serverless' : 'stateful';
  const domain = getScoutTargetDomain(config);

  return {
    type: location,
    mode: domain ? new ScoutTestTarget(location, arch, domain).tagWithoutLocation : 'unknown',
  };
};
