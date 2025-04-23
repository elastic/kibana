/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { AsApiContract } from '@kbn/actions-types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../constants';
import { transformResolvedRule } from '../../transformations';
import type { ResolvedRule } from '../../types';

export async function resolveRule({
  http,
  id,
}: {
  http: HttpSetup;
  id: string;
}): Promise<ResolvedRule> {
  const remoteRules = Object.fromEntries(
    Object.entries(
      await http.get<AsApiContract<Record<string, ResolvedRule | { error: any }>>>(
        `/internal/alerting/rule/${encodeURIComponent(id)}/_resolve/_remote`
      )
    ).map(([key, value]) => {
      if ('error' in value) {
        return [key, value];
      }
      return [key, transformResolvedRule(value)];
    })
  );
  try {
    const res = await http.get<AsApiContract<ResolvedRule>>(
      `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/_resolve`
    );
    return {
      ...transformResolvedRule(res),
      remoteRules: {
        ...remoteRules,
        _local: transformResolvedRule(res),
      },
    };
  } catch (e) {
    const hasRemoteRules = Object.entries(remoteRules).some((rule) => !('error' in rule));
    if (!hasRemoteRules) {
      throw e;
    }
    const firstRemoteRuleResponse = Object.values(remoteRules).find((r) => !('error' in r));
    if (firstRemoteRuleResponse) {
      return { ...firstRemoteRuleResponse, remoteRules };
    }
    throw e;
  }
}
