/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';
import type { ServerlessProjectType, ServerlessProductTier } from '@kbn/es';

export const formatCurrentDate = () => {
  const now = new Date();

  const format = (num: number, length: number) => String(num).padStart(length, '0');

  return (
    `${format(now.getDate(), 2)}/${format(now.getMonth() + 1, 2)}/${now.getFullYear()} ` +
    `${format(now.getHours(), 2)}:${format(now.getMinutes(), 2)}:${format(now.getSeconds(), 2)}.` +
    `${format(now.getMilliseconds(), 3)}`
  );
};

export const getProjectType = (kbnServerArgs: string[]) => {
  const options = getopts(kbnServerArgs);
  return options.serverless as ServerlessProjectType;
};

export const getOrganizationId = (kbnServerArgs: string[]) => {
  return getopts(kbnServerArgs)['xpack.cloud.organization_id'] as string | undefined;
};

const parseJsonArg = <T>(value: unknown): T | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

/**
 * Resolves the serverless product tier from `kbnTestServer.serverArgs`.
 *
 * - `security` projects encode the tier in
 *   `--xpack.securitySolutionServerless.productTypes` (an array of
 *   `{ product_line, product_tier }`). The `security` line is preferred when
 *   present (e.g. `security_essentials`); otherwise the first entry is used so
 *   that single-line projects like `ai_soc` (`search_ai_lake`) still resolve.
 *   When the arg is absent or unparsable, the implicit `complete` tier is
 *   returned.
 * - `oblt` projects encode the tier in `--pricing.tiers.products` (an array of
 *   `{ name, tier }`); we read the `observability` entry. When the arg is
 *   absent or unparsable, the implicit `complete` tier is returned.
 * - For project types that don't expose a tier today (e.g. `es`,
 *   `workplaceai`), returns `undefined`.
 */
export const getProductTier = (
  kbnServerArgs: string[],
  projectType: ServerlessProjectType | undefined
): ServerlessProductTier | undefined => {
  const options = getopts(kbnServerArgs);

  if (projectType === 'security') {
    const productTypes = parseJsonArg<Array<{ product_line: string; product_tier: string }>>(
      options['xpack.securitySolutionServerless.productTypes']
    );
    const securityEntry = productTypes?.find((entry) => entry.product_line === 'security');
    const tier = securityEntry?.product_tier ?? productTypes?.[0]?.product_tier;
    return (tier ?? 'complete') as ServerlessProductTier;
  }

  if (projectType === 'oblt') {
    const products = parseJsonArg<Array<{ name: string; tier: string }>>(
      options['pricing.tiers.products']
    );
    const obltEntry = products?.find((entry) => entry.name === 'observability');
    return (obltEntry?.tier ?? 'complete') as ServerlessProductTier;
  }

  return undefined;
};
