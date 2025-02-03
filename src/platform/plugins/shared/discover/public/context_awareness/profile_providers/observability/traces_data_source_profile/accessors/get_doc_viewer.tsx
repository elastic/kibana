/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { spanAttributeIds, transactionAttributeIds } from '../resources/attribute_ids';
import { getAttributeConfiguration } from '../resources/get_attribute_configuration';

export const getDocViewer =
  (prev, { context }) =>
  (params) => {
    const recordId = params.record.id;
    const prevValue = prev(params);
    const dataStreamTypes = params.record.flattened['data_stream.type'];
    const dataStreamType = Array.isArray(dataStreamTypes) ? dataStreamTypes[0] : dataStreamTypes;

    const isTrace = dataStreamType === 'traces';
    if (!isTrace) {
      return {
        title: `Record #${recordId}`,
        docViewsRegistry: (registry) => registry,
      };
    }
    const parentId = params.record.flattened['parent.id'];
    const documentName = parentId ? 'Span' : 'Transaction'; // TODO: use i18n (?)
    const isTransaction = !parentId;

    return {
      title: `Record #${recordId}`,
      docViewsRegistry: (registry) => {
        registry.add({
          id: 'doc_view_overview',
          title: `${documentName} ${i18n.translate('discover.docViews.tracesOverview.title', {
            defaultMessage: 'Overview',
          })}`,
          order: 0,
          component: () => {
            const panelTitle = `${documentName}  ${i18n.translate(
              'discover.docViews.tracesOverview.details.title',
              {
                defaultMessage: 'detail',
              }
            )}`;

            return (
              <EuiPanel color="transparent" hasShadow={false} paddingSize="none">
                <EuiSpacer size="m" />
                <EuiTitle size="s">
                  <h1>{panelTitle}</h1>
                </EuiTitle>
                <EuiSpacer size="m" />
                {(isTransaction ? transactionAttributeIds : spanAttributeIds).map((attributeId) => (
                  <>
                    <EuiFlexGroup>
                      <EuiFlexItem>
                        <EuiTitle size="xxxs">
                          <h3>{getAttributeConfiguration(params)[attributeId].title}</h3>
                        </EuiTitle>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        {getAttributeConfiguration(params)[attributeId].content}
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiHorizontalRule margin="xs" />
                  </>
                ))}
              </EuiPanel>
            );
          },
        });

        return prevValue.docViewsRegistry(registry);
      },
    };
  };
