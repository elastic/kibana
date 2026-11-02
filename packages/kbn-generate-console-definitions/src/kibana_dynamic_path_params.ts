/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaDynamicValueSource } from '@kbn/console-plugin/common/constants';
import { toKibanaDynamicValueMarker } from '@kbn/console-plugin/common/constants';

// Path params whose valid values live in the cluster. The OpenAPI document doesn't say where
// to get them from, so they are curated: a URL pattern (up to and including the param) and
// the kind of resource the param holds.
const DYNAMIC_PATH_PARAMS: ReadonlyArray<{ pattern: string; source: KibanaDynamicValueSource }> = [
  { pattern: 'api/spaces/space/{id}', source: 'space' },
  { pattern: 'api/actions/connector/{id}', source: 'connector' },
  { pattern: 'api/actions/connector/{connectorId}', source: 'connector' },
  { pattern: 'api/data_views/data_view/{viewId}', source: 'data_view' },
  { pattern: 'api/alerting/rule/{id}', source: 'rule' },
  { pattern: 'api/alerting/rule/{rule_id}', source: 'rule' },
  { pattern: 'api/alerting/rule/{ruleId}', source: 'rule' },
];

const PARAM_NAME = /\{([^}]+)\}$/;

/**
 * Returns the url components marking the path params of a URL pattern that hold the id of
 * a resource Console can look up in the cluster.
 */
export const getDynamicPathComponents = (pattern: string): Record<string, string> =>
  Object.fromEntries(
    DYNAMIC_PATH_PARAMS.filter((dynamicParam) => pattern.startsWith(dynamicParam.pattern)).flatMap(
      ({ pattern: prefix, source }) => {
        const param = PARAM_NAME.exec(prefix)?.[1];
        return param ? [[param, toKibanaDynamicValueMarker(source)]] : [];
      }
    )
  );
