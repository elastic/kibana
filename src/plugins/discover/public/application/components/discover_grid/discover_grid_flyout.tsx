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
  EuiIcon,
  EuiPortal,
  EuiTitle,
  EuiButtonEmpty,
} from '@elastic/eui';
import { DocViewer } from '../doc_viewer/doc_viewer';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';

interface Props {
  hit: ElasticSearchHit;
  columns: string[];
  getContextAppHref: (id: string) => string;
  indexPattern: IndexPattern;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
}

export const DiscoverGridFlyout = function DiscoverGridInner({
  hit,
  indexPattern,
  columns,
  onFilter,
  onClose,
  getContextAppHref,
  onRemoveColumn,
  onAddColumn,
}: Props) {
  if (!hit) {
    return null;
  }

  return (
    <EuiPortal>
      <EuiFlyout onClose={() => onClose()} size="m" data-test-subj="docTableDetailsFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="s" className="dscTable__flyoutHeader">
                <h2>
                  <EuiIcon type="expand" size="m" />{' '}
                  {i18n.translate('discover.grid.tableRow.detailHeading', {
                    defaultMessage: 'Expanded document',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup
            direction="column"
            responsive={false}
            gutterSize="none"
            alignItems="flexEnd"
          >
            {indexPattern.isTimeBased() && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="documents"
                  href={getContextAppHref ? getContextAppHref(hit._id) : ''}
                  data-test-subj="docTableRowAction"
                >
                  {i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsLinkText', {
                    defaultMessage: 'View surrounding documents',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="document"
                href={`#/doc/${indexPattern.id}/${hit._index}?id=${encodeURIComponent(
                  hit._id as string
                )}`}
                data-test-subj="docTableRowAction"
              >
                {i18n.translate('discover.grid.tableRow.viewSingleDocumentLinkText', {
                  defaultMessage: 'View single document',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <DocViewer
            hit={hit}
            columns={columns}
            indexPattern={indexPattern}
            filter={onFilter}
            onRemoveColumn={onRemoveColumn}
            onAddColumn={onAddColumn}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};
