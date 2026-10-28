/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerlessProductTier, ServerlessProjectType } from '@kbn/es';
import { isServerlessProjectTier, isServerlessProjectType } from '@kbn/es';
import type { ArgValue, KibanaCliArg } from './kibana_cli_args';
import { getArgValue, parseRawFlags } from './kibana_cli_args';

export interface ServerlessProject {
  projectType: ServerlessProjectType;
  productTier?: ServerlessProductTier;
}

const isObject = (entry: unknown): entry is Record<string, unknown> =>
  typeof entry === 'object' && entry !== null;

const asObjects = (value: ArgValue | ArgValue[] | undefined): Array<Record<string, unknown>> => {
  const entries: unknown[] = Array.isArray(value) ? value : [];
  return entries.filter(isObject);
};

const getProductTier = (flags: KibanaCliArg[], projectType: ServerlessProjectType): unknown => {
  if (projectType === 'security') {
    const productTypes = asObjects(
      getArgValue(flags, 'xpack.securitySolutionServerless.productTypes')
    );
    const entry =
      productTypes.find(({ product_line: productLine }) => productLine === 'security') ??
      productTypes[0];
    return entry?.product_tier ?? 'complete';
  }

  if (projectType === 'oblt') {
    const products = asObjects(getArgValue(flags, 'pricing.tiers.products'));
    return products.find(({ name }) => name === 'observability')?.tier ?? 'complete';
  }

  return undefined;
};

/**
 * Reads the serverless project a Kibana test server is started as from its server arguments: the
 * type from `--serverless`, and for security and oblt projects the tier from
 * `--xpack.securitySolutionServerless.productTypes` or `--pricing.tiers.products`, which default
 * to `complete`. Repeated arguments resolve like they do when the server is started.
 */
export const getServerlessProject = (serverArgs: string[]): ServerlessProject | undefined => {
  const flags = parseRawFlags(serverArgs);
  const projectType = getArgValue(flags, 'serverless');
  if (typeof projectType !== 'string' || !isServerlessProjectType(projectType)) {
    return undefined;
  }

  const productTier = getProductTier(flags, projectType);
  return typeof productTier === 'string' && isServerlessProjectTier(productTier)
    ? { projectType, productTier }
    : { projectType };
};
