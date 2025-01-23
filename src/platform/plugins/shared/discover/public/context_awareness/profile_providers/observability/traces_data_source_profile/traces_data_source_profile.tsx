/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { DataSourceCategory, DataSourceProfileProvider } from '../../../profiles';
import { ServiceLink } from './components/service_link';
import { SpanLink } from './components/span_link';
import { TransactionLink } from './components/transaction_link';
import { ErrorGroupLink } from './components/error_group_link';
import { ErrorLink } from './components/error_link';

export const createTracesDataSourceProfileProvider = (): DataSourceProfileProvider<{
  category: DataSourceCategory;
  indexPattern?: string;
}> => ({
  profileId: 'traces-data-source-profile',
  isExperimental: true,
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
        const dataStreamTypes = params.record.flattened['data_stream.type'];
        const dataStreamType = Array.isArray(dataStreamTypes)
          ? dataStreamTypes[0]
          : dataStreamTypes;

        const isLog = dataStreamType === 'logs';
        const isSpan = dataStreamType === 'traces';
        const isError = !!params.record.flattened['error.id'];

        const tabTitle = isError
          ? 'Error'
          : isSpan
          ? `${params.record.flattened['parent.id'] ? 'Span' : 'Transaction'}`
          : isLog
          ? 'Log'
          : '';

        return {
          title: `Record #${recordId}`,
          docViewsRegistry: (registry) => {
            registry.add({
              id: 'doc_view_overview',
              title: `${tabTitle} overview`,
              order: 0,
              component: () => {
                const serviceName = params.record.flattened['service.name'];
                const agentName = params.record.flattened['agent.name']?.toString();

                const traceId = params.record.flattened['trace.id'];
                const transactionName = params.record.flattened['transaction.name'];

                if (isError) {
                  const errorId = params.record.flattened['error.id'];
                  const errorGroupKey = params.record.flattened['error.grouping_key'];
                  const errorMessage = params.record.flattened.message;
                  return (
                    <EuiPanel color="transparent" hasShadow={false}>
                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiText color="subdued" size="xs">
                            Message
                          </EuiText>
                          <ErrorLink
                            serviceName={serviceName as string}
                            errorGroupId={errorGroupKey as string}
                            errorMessage={errorMessage as string}
                            errorId={errorId as string}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="l" />
                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiText color="subdued" size="xs">
                            Error group
                          </EuiText>
                          <ErrorGroupLink
                            serviceName={serviceName as string}
                            errorGroupId={errorGroupKey as string}
                            errorGroupName={errorGroupKey as string}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="l" />
                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiText color="subdued" size="xs">
                            Service
                          </EuiText>
                          <ServiceLink
                            serviceName={serviceName as string}
                            agentName={agentName as string}
                          />
                        </EuiFlexItem>
                        {!!traceId && (
                          <EuiFlexItem>
                            <EuiText color="subdued" size="xs">
                              Transaction
                            </EuiText>
                            <TransactionLink
                              traceId={traceId as string}
                              transactionName={transactionName as string}
                              serviceName={serviceName as string}
                              indexPattern={context.indexPattern}
                            />
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiPanel>
                  );
                }

                if (isSpan) {
                  const spanName = params.record.flattened['span.name'];
                  const spanId = params.record.flattened['span.id'];
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
                              serviceName={serviceName as string}
                              indexPattern={context.indexPattern}
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
                          <ServiceLink
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
                              serviceName={serviceName as string}
                              indexPattern={context.indexPattern}
                            />
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiPanel>
                  );
                }

                if (isLog) {
                  const logMessage = params.record.flattened.message;
                  return (
                    <EuiPanel color="transparent" hasShadow={false}>
                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiText color="subdued" size="xs">
                            Message (TODO ADD LINK)
                          </EuiText>
                          <p>{logMessage as string}</p>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiSpacer size="l" />
                      <EuiFlexGroup>
                        <EuiFlexItem>
                          <EuiText color="subdued" size="xs">
                            Service
                          </EuiText>
                          <ServiceLink
                            serviceName={serviceName as string}
                            agentName={agentName as string}
                          />
                        </EuiFlexItem>
                        {!!traceId && (
                          <EuiFlexItem>
                            <EuiText color="subdued" size="xs">
                              Transaction
                            </EuiText>
                            <TransactionLink
                              traceId={traceId as string}
                              transactionName={transactionName as string}
                              serviceName={serviceName as string}
                              indexPattern={context.indexPattern}
                            />
                          </EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    </EuiPanel>
                  );
                }
              },
            });

            return prevValue.docViewsRegistry(registry);
          },
        };
      },
  },

  resolve: (params) => {
    const dataViewId = params.dataView?.id;

    if (dataViewId !== 'apm_static_data_view_id_default') {
      return { isMatch: false };
    }

    return {
      isMatch: true,
      context: {
        category: DataSourceCategory.Traces,
        indexPattern: params.dataView?.getIndexPattern(),
      },
    };
  },
});
