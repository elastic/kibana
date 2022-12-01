/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { useQuerySubscriber } from '@kbn/unified-field-list-plugin/public';
import { TermsExplorerTable, type TermsExplorerTableProps } from './terms_explorer_table';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import './terms_explorer.scss';
import {
  FieldCardinalityRequest,
  FieldCardinalityResponse,
} from '../../../../../common/terms_explorer/types';

export const TermsExplorerTab: React.FC<Omit<TermsExplorerTableProps, 'query' | 'filters'>> =
  React.memo(({ collapseFieldName, ...props }) => {
    const services = useDiscoverServices();
    const querySubscriberResult = useQuerySubscriber({
      data: services.data,
    });

    const [collapseField, setCollapseField] = useState(collapseFieldName);

    useEffect(() => {
      (async () => {
        if (!collapseField) {
          let fieldWithMinCardinality = {
            field: 'n/a',
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
          setCollapseField(fieldWithMinCardinality.field);
        }
      })();
    }, [props.columns, props.dataView, services.http, collapseField]);

    return (
      <div className={'kbnTermsExplorerWrapper'}>
        <TermsExplorerTable
          {...props}
          collapseFieldName={collapseField}
          query={querySubscriberResult.query}
          timeRange={querySubscriberResult.timeRange}
          filters={querySubscriberResult.filters}
        />
      </div>
    );
  });
