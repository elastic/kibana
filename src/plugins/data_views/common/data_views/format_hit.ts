/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { DataView } from './data_view';
import { FieldFormatsContentType } from '../../../field_formats/common';

const formattedCache = new WeakMap();
const partialFormattedCache = new WeakMap();

// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formatted version
export function formatHitProvider(dataView: DataView, defaultFormat: any) {
  function convert(
    hit: Record<string, any>,
    val: any,
    fieldName: string,
    type: FieldFormatsContentType = 'html'
  ) {
    const field = dataView.fields.getByName(fieldName);
    const format = field ? dataView.getFormatterForField(field) : defaultFormat;

    return format.convert(val, type, { field, hit, indexPattern: dataView });
  }

  function formatHit(hit: Record<string, any>, type: string = 'html') {
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

    _.forOwn(dataView.flattenHit(hit), function (val: any, fieldName?: string) {
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

  formatHit.formatField = function (hit: Record<string, any>, fieldName: string) {
    let partials = partialFormattedCache.get(hit);
    if (partials && partials[fieldName] != null) {
      return partials[fieldName];
    }

    if (!partials) {
      partials = {};
      partialFormattedCache.set(hit, partials);
    }

    const val = fieldName === '_source' ? hit._source : dataView.flattenHit(hit)[fieldName];
    return convert(hit, val, fieldName);
  };

  return formatHit;
}
