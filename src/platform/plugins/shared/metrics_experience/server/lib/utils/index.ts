/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { notFound } from '@hapi/boom';
import type { FeatureFlagsRequestHandlerContext } from '@kbn/core-feature-flags-server';
import { BasicPrettyPrinter, Parser, Walker } from '@kbn/esql-ast';
import type { ESQLCommand } from '@kbn/esql-ast';
import { METRICS_EXPERIENCE_FEATURE_FLAG_KEY } from '../../../common/constants';

export const throwNotFoundIfMetricsExperienceDisabled = async (
  featureFlag: FeatureFlagsRequestHandlerContext
) => {
  const isEnabled = await featureFlag.getBooleanValue(METRICS_EXPERIENCE_FEATURE_FLAG_KEY, true);

  if (!isEnabled) {
    throw notFound();
  }
};

/**
 * Extracts the WHERE command from an ES|QL query string.
 * This is useful for preserving user-applied filters from Discover queries.
 *
 * @param esqlQuery - The ES|QL query string to parse
 * @returns The WHERE command node if found, undefined otherwise
 */
export function extractWhereCommand(esqlQuery: string) {
  if (!esqlQuery || esqlQuery.trim().length === 0) {
    return undefined;
  }

  try {
    const ast = Parser.parse(esqlQuery);
    const whereNode = Walker.find(
      ast.root,
      (node): node is ESQLCommand => node.type === 'command' && node.name === 'where'
    );
    return whereNode ? BasicPrettyPrinter.print(whereNode) : undefined;
  } catch (error) {
    return undefined;
  }
}
