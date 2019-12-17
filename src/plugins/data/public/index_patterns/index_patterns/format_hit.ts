/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { IndexPattern } from './index_pattern';
import { HTML_CONTENT_TYPE, TEXT_CONTENT_TYPE } from '../../';

const formattedCache = new WeakMap();
const partialFormattedCache = new WeakMap();

// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formatted version
export function formatHitProvider(indexPattern: IndexPattern, defaultFormat: any) {
  function convert(
    hit: Record<string, any>,
    val: any,
    fieldName: string,
    type = HTML_CONTENT_TYPE
  ) {
    const field = indexPattern.fields.getByName(fieldName);
    if (!field) return defaultFormat.convert(val, type);
    const parsedUrl = {
      origin: window.location.origin,
      pathname: window.location.pathname,
    };
    const options = { field, hit, parsedUrl };
    return field.format.getConverterFor(type)(val, options);
  }

  function formatHit(hit: Record<string, any>, type = HTML_CONTENT_TYPE) {
    if (type === TEXT_CONTENT_TYPE) {
      // formatHit of type text is for react components to get rid of <span ng-non-bindable>
      // since it's currently just used at the discover's doc view table, caching is not necessary
      const flattened = indexPattern.flattenHit(hit);
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(flattened)) {
        result[key] = convert(hit, value, key, type);
      }
      return result;
    }

    const cached = formattedCache.get(hit);
    if (cached) {
      return cached;
    }

    // use and update the partial cache, but don't rewrite it.
    // _source is stored in partialFormattedCache but not formattedCache
    const partials = partialFormattedCache.get(hit) || {};
    partialFormattedCache.set(hit, partials);

    const cache: Record<string, any> = {};
    formattedCache.set(hit, cache);

    _.forOwn(indexPattern.flattenHit(hit), function(val: any, fieldName?: string) {
      // sync the formatted and partial cache
      if (!fieldName) {
        return;
      }
      const formatted =
        partials[fieldName] == null ? convert(hit, val, fieldName) : partials[fieldName];
      cache[fieldName] = partials[fieldName] = formatted;
    });

    return cache;
  }

  formatHit.formatField = function(hit: Record<string, any>, fieldName: string) {
    let partials = partialFormattedCache.get(hit);
    if (partials && partials[fieldName] != null) {
      return partials[fieldName];
    }

    if (!partials) {
      partials = {};
      partialFormattedCache.set(hit, partials);
    }

    const val = fieldName === '_source' ? hit._source : indexPattern.flattenHit(hit)[fieldName];
    return convert(hit, val, fieldName);
  };

  return formatHit;
}
