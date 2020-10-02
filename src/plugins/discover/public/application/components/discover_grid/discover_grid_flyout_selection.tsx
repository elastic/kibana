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
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPortal,
  EuiTitle,
} from '@elastic/eui';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { JsonCodeBlock } from '../json_code_block/json_code_block';
import { IndexPattern } from '../../../kibana_services';

interface Props {
  indexPattern: IndexPattern;
  rows: ElasticSearchHit[];
  selected: number[];
  onClose: () => void;
}

export function DiscoverGridFlyoutSelection({ indexPattern, rows, selected, onClose }: Props) {
  return (
    <EuiPortal>
      <EuiFlyout onClose={() => onClose()} size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle className="dscTable__flyoutHeader">
                <h2>
                  <EuiIcon type="folderOpen" size="l" />{' '}
                  {i18n.translate('discover.grid.tableRow.selectedDocuments', {
                    defaultMessage: 'Selected records',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <h2 className="euiScreenReaderOnly" id="documentSelectionAriaLabel">
            {i18n.translate('discover.grid.documentSelectionAriaLabel', {
              defaultMessage: 'Records selection',
            })}
          </h2>
          {selected.length > 0 &&
            selected.map((rowIndex) => (
              <div key={rowIndex}>
                <EuiAccordion
                  id={String(rowIndex)}
                  buttonContent={`#${rowIndex} ${rows[rowIndex]._id}`}
                  initialIsOpen={true}
                >
                  <div
                    style={{
                      maxHeight: '300px',
                      overflow: 'hidden',
                      overflowY: 'scroll',
                      paddingBottom: '1em',
                    }}
                  >
                    <JsonCodeBlock hit={rows[rowIndex]} indexPattern={indexPattern} />
                  </div>
                </EuiAccordion>
              </div>
            ))}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
