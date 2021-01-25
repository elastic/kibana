/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

import { IAggConfig } from '../agg_config';
import { BaseParamType } from './base';

export class JsonParamType extends BaseParamType {
  constructor(config: Record<string, any>) {
    super(config);

    this.name = config.name || 'json';

    if (!config.write) {
      this.write = (aggConfig: IAggConfig, output: Record<string, any>) => {
        let paramJson;
        const param = aggConfig.params[this.name];

        if (!param) {
          return;
        }

        // handle invalid Json input
        try {
          paramJson = JSON.parse(param);
        } catch (err) {
          return;
        }

        function filteredCombine(srcA: any, srcB: any) {
          function mergeObjs(a: any, b: any) {
            return _(a)
              .keys()
              .union(_.keys(b))
              .transform(function (dest: any, key) {
                const val = compare(a[key], b[key]);
                if (val !== undefined) dest[key] = val;
              }, {})
              .value();
          }

          function mergeArrays(a: any, b: any): any {
            // attempt to merge each value
            return _.times(Math.max(a.length, b.length), function (i) {
              return compare(a[i], b[i]);
            });
          }

          function compare(a: any, b: any) {
            if (_.isPlainObject(a) && _.isPlainObject(b)) return mergeObjs(a, b);
            if (Array.isArray(a) && Array.isArray(b)) return mergeArrays(a, b);
            if (b === null) return undefined;
            if (b !== undefined) return b;
            return a;
          }

          return compare(srcA, srcB);
        }

        output.params = filteredCombine(output.params, paramJson);
        return;
      };
    }
  }
}
