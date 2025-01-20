/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { isDataSourceType, DataSourceType } from '../../../../../common/data_sources';
import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';
import { ServiceNameLink } from './components/service_name_link';
import { SpanLink } from './components/span_link';
import { TransactionLink } from './components/transaction_link';

export const createTracesDataSourceProfileProvider = (): DataSourceProfileProvider => ({
  profileId: 'traces-data-source-profile',
  // isExperimental: true,
  profile: {
    getDefaultAppState: () => () => ({
      columns: [
        {
          name: '@timestamp',
          width: 212,
        },
        {
          name: 'span.name',
        },
        {
          name: 'service.name',
        },
      ],
      rowHeight: 5,
    }),
    getDocViewer:
      (prev, { context }) =>
      (params) => {
        const recordId = params.record.id;
        const prevValue = prev(params);
        return {
          title: `Record #${recordId}`,
          docViewsRegistry: (registry) => {
            registry.add({
              id: 'doc_view_overview',
              title: `${params.record.flattened['parent.id'] ? 'Span' : 'Transaction'} overview`,
              order: 0,
              component: () => {
                const spanName = params.record.flattened['span.name'];
                const spanId = params.record.flattened['span.id'];
                const transactionName = params.record.flattened['transaction.name'];
                const serviceName = params.record.flattened['service.name'];
                const agentName = params.record.flattened['agent.name']?.toString();
                const traceId = params.record.flattened['trace.id'];
                const isRootSpan = !params.record.flattened['parent.id'];
                return (
                  <EuiPanel color="transparent" hasShadow={false}>
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        <EuiText color="subdued" size="xs">
                          Name
                        </EuiText>
                      {isRootSpan ? (
                          <TransactionLink
                            traceId={traceId as string}
                            transactionName={transactionName as string}
                          />
                      ) : (
                          <SpanLink
                            spanId={spanId as string}
                            spanName={spanName as string}
                            traceId={traceId as string}
                          />
                        )}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer size="l" />
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        <EuiText color="subdued" size="xs">
                          Service
                        </EuiText>
                        <ServiceNameLink
                          serviceName={serviceName as string}
                          agentName={agentName as string}
                        />
                      </EuiFlexItem>
                      {!isRootSpan && (
                        <EuiFlexItem>
                          <EuiText color="subdued" size="xs">
                            Transaction
                          </EuiText>
                          <TransactionLink
                            traceId={traceId as string}
                            transactionName={transactionName as string}
                          />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiPanel>
                );
              },
            });

            return prevValue.docViewsRegistry(registry);
          },
        };
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

    if (!indexPattern?.includes('traces')) {
      // TODO Define a better way to enable traces data source
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Traces,
      },
    };
  },
});
