/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPattern, IndexPatternField, IndexPatternType } from '../../../../data/public';
import { IndexPatternListConfig } from '.';

function isRollup(indexPattern: IndexPattern) {
  return indexPattern.type === IndexPatternType.ROLLUP;
}

export class RollupIndexPatternListConfig extends IndexPatternListConfig {
  key = IndexPatternType.ROLLUP;

  getIndexPatternTags = (indexPattern: IndexPattern) => {
    return isRollup(indexPattern)
      ? [
          {
            key: 'rollup',
            name: 'Rollup',
          },
        ]
      : [];
  };

  getFieldInfo = (indexPattern: IndexPattern, field: IndexPatternField) => {
    if (!isRollup(indexPattern)) {
      return [];
    }

    const allAggs = indexPattern.typeMeta && indexPattern.typeMeta.aggs;
    const fieldAggs = allAggs && Object.keys(allAggs).filter((agg) => allAggs[agg][field.name]);

    if (!fieldAggs || !fieldAggs.length) {
      return [];
    }

    return ['Rollup aggregations:'].concat(
      fieldAggs.map((aggName) => {
        const agg = allAggs![aggName][field.name];
        switch (aggName) {
          case 'date_histogram':
            return `${aggName} (interval: ${agg.fixed_interval}, ${
              agg.delay ? `delay: ${agg.delay},` : ''
            } ${agg.time_zone})`;
          case 'histogram':
            return `${aggName} (interval: ${agg.interval})`;
          default:
            return aggName;
        }
      })
    );
  };

  areScriptedFieldsEnabled = (indexPattern: IndexPattern) => {
    return !isRollup(indexPattern);
  };
}
