/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React, { useEffect } from 'react';

import { useQuerySubscriber } from '@kbn/unified-field-list-plugin/public';

import {
  FieldCardinalityRequest,
  FieldCardinalityResponse,
} from '../../../../../common/terms_explorer/types';
import './terms_explorer.scss';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { TermsExplorerTable, type TermsExplorerTableProps } from './terms_explorer_table';

export const TermsExplorerTab: React.FC<
  Omit<TermsExplorerTableProps, 'query' | 'filters' | 'collapseFieldName' | 'isTopLevel'> & {
    setCollapseOnColumn: React.Dispatch<string | undefined>;
    collapseOnColumn?: string;
  }
> = React.memo(({ setCollapseOnColumn, collapseOnColumn, ...props }) => {
  const services = useDiscoverServices();
  const querySubscriberResult = useQuerySubscriber({
    data: services.data,
  });

  useEffect(() => {
    if (props.columns.length === 0) {
      setCollapseOnColumn(undefined);
    }
  }, [props.columns.length, setCollapseOnColumn]);

  useEffect(() => {
    if (props.columns?.length === 0) return;
    (async () => {
      if (!collapseOnColumn) {
        let fieldWithMinCardinality = {
          field: '',
          cardinality: Number.MAX_SAFE_INTEGER,
        };
        for (const columnName of props.columns) {
          const cardinalityRequestBody: FieldCardinalityRequest = {
            fieldName: columnName,
          };
          const response = await services.http.fetch<FieldCardinalityResponse>(
            `/api/kibana/discover/fieldCardinality/${props.dataView.getIndexPattern()}`,
            {
              body: JSON.stringify(cardinalityRequestBody),
              method: 'POST',
            }
          );
          if (response.cardinality < fieldWithMinCardinality.cardinality) {
            fieldWithMinCardinality = {
              field: columnName,
              cardinality: response.cardinality,
            };
          }
        }
        setCollapseOnColumn(fieldWithMinCardinality.field);
      }
    })();
  }, [props.columns, props.dataView, services.http, collapseOnColumn, setCollapseOnColumn]);

  if (!collapseOnColumn || props.columns?.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="fold"
        title={<h2>Start adding columns</h2>}
        body={<p>Choose a field on the left to show its unique values</p>}
      />
    );
  }
  return (
    <div className={'kbnTermsExplorerWrapper'}>
      <TermsExplorerTable
        {...props}
        isTopLevel={true}
        collapseFieldName={collapseOnColumn}
        query={querySubscriberResult.query}
        timeRange={querySubscriberResult.timeRange}
        filters={querySubscriberResult.filters}
      />
    </div>
  );
});
