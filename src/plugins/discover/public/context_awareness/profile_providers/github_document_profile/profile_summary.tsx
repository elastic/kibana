/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './github.scss';
import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataSourceType, isDataSourceType } from '../../../../common/data_sources';
import {
  DataSourceCategory,
  DataSourceProfileProvider,
  DocumentProfileProvider,
  DocumentType,
} from '../../profiles';

export const githubSummaryDocumentProfileProvider: DocumentProfileProvider = {
  profileId: 'github-summary-document-profile-summary',
  profile: {
    getDocViewer: (prev) => (params) => {
      const prevValue = prev(params);

      return {
        ...prevValue,
        docViewsRegistry: (registry) => {
          registry.add({
            id: 'doc_view_github',
            title: i18n.translate('discover.docViews.github', {
              defaultMessage: 'Summary',
            }),
            order: 0,
            component: (props) => {
              return (
                <EuiFlexGroup direction="column" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiSpacer size="s" />
                    <EuiTitle>
                      <h1>{props.hit.flattened.title}</h1>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiMarkdownFormat textSize="s" className="githubMarkDown">
                      {props.hit.flattened.body as string}
                    </EuiMarkdownFormat>
                  </EuiFlexItem>
                </EuiFlexGroup>
              );
            },
          });

          return prevValue.docViewsRegistry(registry);
        },
      };
    },
  },
  resolve: (params) => {
    if (getFieldValue(params.record, 'is_pullrequest') !== true) {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        type: DocumentType.Log,
      },
    };
  },
};

export const githubSummaryDataSourceProfileProvider: DataSourceProfileProvider = {
  profileId: 'github-summary-data-source-profile',
  profile: {
    getCellRenderers: (prev) => () => ({
      ...prev(),
      _source: (props) => {
        const user = getFieldValue(props.row, 'user');
        const title = getFieldValue(props.row, 'title');
        const labels = getFieldValues(props.row, 'labels');
        const number = getFieldValue(props.row, 'number');
        const labelsArr = Array.isArray(labels) ? labels : [];

        if (!user) {
          return <span>(None)</span>;
        }
        return (
          <>
            <EuiFlexGroup gutterSize="l" wrap>
              <EuiFlexItem grow={false}>
                <EuiAvatar size="l" name={user} imageUrl={getAvatarUrl(user as string, 100)} />
              </EuiFlexItem>
              <EuiFlexItem grow={6}>
                <EuiText size="s">
                  {title} (
                  <EuiLink
                    href={`https://github.com/elastic/kibana/pull/${number}`}
                    target="_blank"
                  >
                    #{number}
                  </EuiLink>{' '}
                  by{' '}
                  <EuiLink href={`https://github.com/${user}`} target="_blank">
                    {user}
                  </EuiLink>
                  )
                </EuiText>
                <EuiFlexGroup wrap gutterSize="xs" style={{ paddingTop: '6px' }}>
                  {labelsArr.map((label) => {
                    return (
                      <EuiFlexItem grow={false} key={label}>
                        <EuiBadge key={label} color="hollow">
                          {label}
                        </EuiBadge>
                      </EuiFlexItem>
                    );
                  })}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        );
      },
    }),
    getDefaultAppState: () => () => {
      return { columns: [], rowHeight: -1 };
    },
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

    if (indexPattern !== 'issues_elastic_*') {
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

const getFieldValues = (record: DataTableRecord, field: string) => {
  return record.flattened[field];
};

function getAvatarUrl(user: string, width: number = 100) {
  return `https://github.com/${user}.png?size=${width}`;
}
