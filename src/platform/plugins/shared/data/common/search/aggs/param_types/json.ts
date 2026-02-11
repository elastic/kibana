/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

import type { IAggConfig } from '../agg_config';
import type { AggParamOutput } from './base';
import { BaseParamType } from './base';

function collapseLiteralStrings(xjson: string) {
  const tripleQuotes = '"""';
  const splitData = xjson.split(tripleQuotes);

  for (let idx = 1; idx < splitData.length - 1; idx += 2) {
    splitData[idx] = JSON.stringify(splitData[idx]);
  }

  return splitData.join('');
}

export class JsonParamType extends BaseParamType {
  constructor(config: Record<string, unknown>) {
    super(config);

    this.name = (config.name as string) || 'json';

    if (!config.write) {
      this.write = (aggConfig: IAggConfig, output: AggParamOutput) => {
        let paramJson;
        const param = aggConfig.params[this.name];

        if (!param) {
          return;
        }

        try {
          paramJson = JSON.parse(collapseLiteralStrings(param as string));
        } catch (err) {
          return;
        }

        function filteredCombine(srcA: unknown, srcB: unknown): unknown {
          function mergeObjs(
            a: Record<string, unknown>,
            b: Record<string, unknown>
          ): Record<string, unknown> {
            return _(a)
              .keys()
              .union(_.keys(b))
              .transform(function (dest: Record<string, unknown>, key) {
                const val = compare(a[key], b[key]);
                if (val !== undefined) dest[key] = val;
              }, {})
              .value();
          }

          function mergeArrays(a: unknown[], b: unknown[]): unknown[] {
            // attempt to merge each value
            return _.times(Math.max(a.length, b.length), function (i) {
              return compare(a[i], b[i]);
            });
          }

          function compare(a: unknown, b: unknown): unknown {
            if (_.isPlainObject(a) && _.isPlainObject(b))
              return mergeObjs(a as Record<string, unknown>, b as Record<string, unknown>);
            if (Array.isArray(a) && Array.isArray(b)) return mergeArrays(a, b);
            if (b === null) return undefined;
            if (b !== undefined) return b;
            return a;
          }

          return compare(srcA, srcB);
        }

        output.params = filteredCombine(output.params, paramJson) as Record<string, unknown>;
        return;
      };
    }
  }
}
