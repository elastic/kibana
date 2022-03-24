/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, sortBy, without, each, defaults, isObject } from 'lodash';
import { i18n } from '@kbn/i18n';
import { flattenHit } from '../../../../../../../data/public';

function getFieldValues(hits, field, indexPattern) {
  const name = field.name;
  return map(hits, function (hit) {
    return flattenHit(hit, indexPattern, { includeIgnoredValues: true })[name];
  });
}

function getFieldValueCounts(params) {
  params = defaults(params, {
    count: 5,
    grouped: false,
  });

  if (
    params.field.type === 'geo_point' ||
    params.field.type === 'geo_shape' ||
    params.field.type === 'attachment'
  ) {
    return {
      error: i18n.translate(
        'discover.fieldChooser.fieldCalculator.analysisIsNotAvailableForGeoFieldsErrorMessage',
        {
          defaultMessage: 'Analysis is not available for geo fields.',
        }
      ),
    };
  }

  const allValues = getFieldValues(params.hits, params.field, params.indexPattern);
  let counts;
  const missing = _countMissing(allValues);

  try {
    const groups = _groupValues(allValues, params);
    counts = map(sortBy(groups, 'count').reverse().slice(0, params.count), function (bucket) {
      return {
        value: bucket.value,
        count: bucket.count,
        percent: ((bucket.count / (params.hits.length - missing)) * 100).toFixed(1),
      };
    });

    if (params.hits.length - missing === 0) {
      return {
        error: i18n.translate(
          'discover.fieldChooser.fieldCalculator.fieldIsNotPresentInDocumentsErrorMessage',
          {
            defaultMessage:
              'This field is present in your Elasticsearch mapping but not in the {hitsLength} documents shown in the doc table. You may still be able to visualize or search on it.',
            values: {
              hitsLength: params.hits.length,
            },
          }
        ),
      };
    }

    return {
      total: params.hits.length,
      exists: params.hits.length - missing,
      missing: missing,
      buckets: counts,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// returns a count of fields in the array that are undefined or null
function _countMissing(array) {
  return array.length - without(array, undefined, null).length;
}

function _groupValues(allValues, params) {
  const groups = {};
  let k;

  allValues.forEach(function (value) {
    if (isObject(value) && !Array.isArray(value)) {
      throw new Error(
        i18n.translate(
          'discover.fieldChooser.fieldCalculator.analysisIsNotAvailableForObjectFieldsErrorMessage',
          {
            defaultMessage: 'Analysis is not available for object fields.',
          }
        )
      );
    }

    if (Array.isArray(value) && !params.grouped) {
      k = value;
    } else {
      k = value == null ? undefined : [value];
    }

    each(k, function (key) {
      if (groups.hasOwnProperty(key)) {
        groups[key].count++;
      } else {
        groups[key] = {
          value: params.grouped ? value : key,
          count: 1,
        };
      }
    });
  });

  return groups;
}

export const fieldCalculator = {
  _groupValues: _groupValues,
  _countMissing: _countMissing,
  getFieldValues: getFieldValues,
  getFieldValueCounts: getFieldValueCounts,
};
