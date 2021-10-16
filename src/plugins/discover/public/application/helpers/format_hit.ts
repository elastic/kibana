/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { DataView } from '../../../../data/common';
import { MAX_DOC_FIELDS_DISPLAYED } from '../../../common';
import { getServices } from '../../kibana_services';

// TODO: Test coverage
// TODO: documentation

export function formatHit(
  hit: estypes.SearchHit,
  dataView: DataView,
  fieldsToShow: string[]
): Array<[string, string]> {
  const highlights = hit.highlight ?? {};
  // Keys are sorted in the hits object
  const formatted = dataView.formatHit(hit);
  const highlightPairs: Array<[string, string]> = [];
  const sourcePairs: Array<[string, string]> = [];
  Object.entries(formatted).forEach(([key, val]) => {
    const displayKey = dataView.fields.getByName(key)?.displayName;
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    if (displayKey) {
      if (fieldsToShow.includes(key)) {
        pairs.push([displayKey, val as string]);
      }
    } else {
      pairs.push([key, val as string]);
    }
  });
  const maxEntries = getServices().uiSettings.get<number>(MAX_DOC_FIELDS_DISPLAYED);
  return [...highlightPairs, ...sourcePairs].slice(0, maxEntries);
}
