/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import { capitalize } from 'lodash';
import React from 'react';
import { DataSourceType, isDataSourceType } from '../../../../common/data_sources';
import { DataSourceCategory, DataSourceProfileProvider } from '../../profiles';

export const exampleDataSourceProfileProvider: DataSourceProfileProvider = {
  profileId: 'example-data-source-profile',
  profile: {
    getCellRenderers: (prev) => () => ({
      ...prev(),
      'log.level': (props) => {
        const level = getFieldValue(props.row, 'log.level');

        if (!level) {
          return (
            <span
              css={{ color: euiThemeVars.euiTextSubduedColor }}
              data-test-subj="exampleDataSourceProfileLogLevelEmpty"
            >
              (None)
            </span>
          );
        }

        const levelMap: Record<string, string> = {
          info: 'primary',
          debug: 'default',
          error: 'danger',
        };

        return (
          <EuiBadge
            color={levelMap[level]}
            title={level}
            data-test-subj="exampleDataSourceProfileLogLevel"
          >
            {capitalize(level)}
          </EuiBadge>
        );
      },
    }),
  },
  resolve: (params) => {
    let indexPattern: string | undefined;

    if (isDataSourceType(params.dataSource, DataSourceType.Esql)) {
      if (!isOfAggregateQueryType(params.query)) {
        return { isMatch: false };
      }

      indexPattern = getIndexPatternFromESQLQuery(params.query.esql);
    } else if (isDataSourceType(params.dataSource, DataSourceType.DataView) && params.dataView) {
      indexPattern = params.dataView.getIndexPattern();
    }

    if (indexPattern !== 'my-example-logs') {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: { category: DataSourceCategory.Logs },
    };
  },
};

const getFieldValue = (record: DataTableRecord, field: string) => {
  const value = record.flattened[field];
  return Array.isArray(value) ? value[0] : value;
};
