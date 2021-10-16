/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { DataView, flattenHit } from '../../../../data/common';
import { MAX_DOC_FIELDS_DISPLAYED } from '../../../common';
import { getServices } from '../../kibana_services';
import { formatFieldValue } from './format_value';

// TODO: Test coverage
// TODO: documentation

const formattedHitCache = new WeakMap<estypes.SearchHit, FormattedHit>();

type FormattedHit = Array<[string, JSX.Element]>;

export function formatHit(
  hit: estypes.SearchHit,
  dataView: DataView,
  fieldsToShow: string[]
): FormattedHit {
  const cached = formattedHitCache.get(hit);
  if (cached) {
    return cached;
  }

  const highlights = hit.highlight ?? {};
  // Keys are sorted in the hits object
  const flattened = flattenHit(hit, dataView, { includeIgnoredValues: true, source: true });

  const highlightPairs: Array<[string, JSX.Element]> = [];
  const sourcePairs: Array<[string, JSX.Element]> = [];
  Object.entries(flattened).forEach(([key, val]) => {
    const displayKey = dataView.fields.getByName(key)?.displayName;
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    const formattedValue = formatFieldValue(val, hit, dataView, dataView.fields.getByName(key));
    if (displayKey) {
      if (fieldsToShow.includes(key)) {
        pairs.push([displayKey, formattedValue]);
      }
    } else {
      pairs.push([key, formattedValue]);
    }
  });
  const maxEntries = getServices().uiSettings.get<number>(MAX_DOC_FIELDS_DISPLAYED);
  const formatted = [...highlightPairs, ...sourcePairs].slice(0, maxEntries);
  formattedHitCache.set(hit, formatted);
  return formatted;
}
