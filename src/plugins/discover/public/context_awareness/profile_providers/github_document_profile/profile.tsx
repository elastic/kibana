/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import './github.scss';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiThemeVars } from '@kbn/ui-theme';

import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { DataSourceType, isDataSourceType } from '../../../../common/data_sources';
import {
  DataSourceCategory,
  DataSourceProfileProvider,
  DocumentProfileProvider,
  DocumentType,
} from '../../profiles';
import { SpaceInvaders } from './game';

export const githubDocumentProfileProvider: DocumentProfileProvider = {
  profileId: 'github-document-profile',
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

          registry.add({
            id: 'doc_view_github_2',
            title: i18n.translate('discover.docViews.github', {
              defaultMessage: '👾',
            }),
            order: 4,
            component: (props) => {
              return (
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <SpaceInvaders
                      avatarUrl={getAvatarUrl(props.hit.flattened.user as string, 100)}
                    />
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

export const githubDataSourceProfileProvider: DataSourceProfileProvider = {
  profileId: 'github-data-source-profile',
  profile: {
    getCellRenderers: (prev) => () => ({
      ...prev(),
      number: (props) => {
        const number = getFieldValue(props.row, 'number');
        if (!number) {
          return <span css={{ color: euiThemeVars.euiTextSubduedColor }}>(None)</span>;
        }
        return <a href={`https://github.com/elastic/kibana/pull/${number}`}>#{number}</a>;
      },
      user: (props) => {
        const user = getFieldValue(props.row, 'user');

        if (!user) {
          return <span css={{ color: euiThemeVars.euiTextSubduedColor }}>(None)</span>;
        }

        return (
          <>
            <img
              src={getAvatarUrl(user as string, 50)}
              width={25}
              height={25}
              alt={user}
              style={{ verticalAlign: 'middle', borderRadius: '50%', border: '1px solid #CCC' }}
            />{' '}
            {user}
          </>
        );
      },
      labels: (props) => {
        const labels = getFieldValues(props.row, 'labels');
        if (!Array.isArray(labels)) {
          return <span css={{ color: euiThemeVars.euiTextSubduedColor }}>(None)</span>;
        }
        const labelComponents = labels.map((label) => {
          return (
            <EuiFlexItem grow={false} key={label}>
              <EuiBadge key={label} color="hollow">
                {label}
              </EuiBadge>
            </EuiFlexItem>
          );
        });
        return (
          <EuiFlexGroup wrap gutterSize="xs">
            {labelComponents}
          </EuiFlexGroup>
        );
      },
    }),
    getDefaultAppState: (prev) => (params) => {
      const prevState = prev(params);
      const columns = prevState?.columns ?? [];

      columns.push(
        { name: 'user', width: 160 },
        { name: 'number', width: 100 },
        { name: 'updated_at.time', width: 260 },
        { name: 'title' },
        { name: 'labels' }
      );

      return { columns, rowHeight: -1 };
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

    if (indexPattern !== 'issues_elastic_kibana') {
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
