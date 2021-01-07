/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiPortal,
} from '@elastic/eui';
import { DocViewer } from '../doc_viewer/doc_viewer';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { DiscoverServices } from '../../../build_services';
import { getContextUrl } from '../../helpers/get_context_url';

interface Props {
  columns: string[];
  hit: ElasticSearchHit;
  indexPattern: IndexPattern;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  services: DiscoverServices;
}

/**
 * Flyout displaying an expanded Elasticsearch document
 */
export function DiscoverGridFlyout({
  hit,
  indexPattern,
  columns,
  onFilter,
  onClose,
  onRemoveColumn,
  onAddColumn,
  services,
}: Props) {
  return (
    <EuiPortal>
      <EuiFlyout onClose={onClose} size="m" data-test-subj="docTableDetailsFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle
            size="s"
            className="dscTable__flyoutHeader"
            data-test-subj="docTableRowDetailsTitle"
          >
            <h2>
              {i18n.translate('discover.grid.tableRow.detailHeading', {
                defaultMessage: 'Expanded document',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />
          <EuiFlexGroup responsive={false} gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('discover.grid.tableRow.viewText', {
                    defaultMessage: 'View:',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="document"
                href={`#/doc/${indexPattern.id}/${hit._index}?id=${encodeURIComponent(
                  hit._id as string
                )}`}
                data-test-subj="docTableRowAction"
              >
                {i18n.translate('discover.grid.tableRow.viewSingleDocumentLinkTextSimple', {
                  defaultMessage: 'Single document',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {indexPattern.isTimeBased() && indexPattern.id && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="documents"
                  href={getContextUrl(hit._id, indexPattern.id, columns, services.filterManager)}
                  data-test-subj="docTableRowAction"
                >
                  {i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsLinkTextSimple', {
                    defaultMessage: 'Surrounding documents',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <DocViewer
            hit={hit}
            columns={columns}
            indexPattern={indexPattern}
            filter={(mapping, value, mode) => {
              onFilter(mapping, value, mode);
              onClose();
            }}
            onRemoveColumn={(columnName: string) => {
              onRemoveColumn(columnName);
              onClose();
            }}
            onAddColumn={(columnName: string) => {
              onAddColumn(columnName);
              onClose();
            }}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
