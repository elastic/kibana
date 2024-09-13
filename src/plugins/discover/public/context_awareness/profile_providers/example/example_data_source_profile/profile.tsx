/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge } from '@elastic/eui';
import { getFieldValue, RowControlColumn } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import { capitalize } from 'lodash';
import React from 'react';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';

export const createExampleDataSourceProfileProvider = (): DataSourceProfileProvider => ({
  profileId: 'example-data-source-profile',
  isExperimental: true,
  profile: {
    getCellRenderers: (prev) => (params) => ({
      ...prev(params),
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
    getDocViewer: (prev) => (params) => {
      const recordId = params.record.id;
      const prevValue = prev(params);
      return {
        title: `Record #${recordId}`,
        docViewsRegistry: (registry) => {
          registry.add({
            id: 'doc_view_example',
            title: 'Example',
            order: 0,
            component: () => (
              <div data-test-subj="exampleDataSourceProfileDocView">Example Doc View</div>
            ),
          });

          return prevValue.docViewsRegistry(registry);
        },
      };
    },
    getRowAdditionalLeadingControls: (prev) => (params) => {
      const additionalControls = prev(params) || [];

      return [
        ...additionalControls,
        ...['visBarVerticalStacked', 'heart', 'inspect'].map(
          (iconType, index): RowControlColumn => ({
            id: `exampleControl_${iconType}`,
            headerAriaLabel: `Example Row Control ${iconType}`,
            renderControl: (Control, rowProps) => {
              return (
                <Control
                  data-test-subj={`exampleLogsControl_${iconType}`}
                  label={`Example ${iconType}`}
                  tooltipContent={`Example ${iconType}`}
                  iconType={iconType}
                  onClick={() => {
                    alert(`Example "${iconType}" control clicked. Row index: ${rowProps.rowIndex}`);
                  }}
                />
              );
            },
          })
        ),
      ];
    },
    getDefaultAppState: () => () => ({
      columns: [
        {
          name: '@timestamp',
          width: 212,
        },
        {
          name: 'log.level',
          width: 150,
        },
        {
          name: 'message',
        },
      ],
      rowHeight: 5,
    }),
    getAdditionalCellActions: (prev) => () =>
      [
        ...prev(),
        {
          id: 'example-data-source-action',
          getDisplayName: () => 'Example data source action',
          getIconType: () => 'plus',
          execute: () => {
            alert('Example data source action executed');
          },
        },
        {
          id: 'another-example-data-source-action',
          getDisplayName: () => 'Another example data source action',
          getIconType: () => 'minus',
          execute: () => {
            alert('Another example data source action executed');
          },
          isCompatible: ({ field }) => field.name !== 'message',
        },
      ],
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
});
