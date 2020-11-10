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

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPortal,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { JsonCodeBlock } from '../json_code_block/json_code_block';
import { DiscoverGridContext, GridContext } from './discover_grid_context';

export type DiscoverGridSelection = Map<string, DiscoverGridSelectionDoc>;

export interface DiscoverGridSelectionDoc {
  id: string;
  added: string;
  record: ElasticSearchHit;
}

export function getSelectedId(record: ElasticSearchHit) {
  return `${record._index}-${record._id}`;
}

export const DiscoverGridSelectButton = ({
  col,
  rows,
}: {
  col: any;
  rows?: ElasticSearchHit[];
}) => {
  const { selected, setSelected } = useContext<GridContext>(DiscoverGridContext);
  const rowIndex = col.rowIndex;
  if (!rows || !rows[rowIndex]) {
    return null;
  }
  const record = rows[rowIndex];
  const id = getSelectedId(record);
  const isChecked = selected.has(id);
  if (!rows) {
    return null;
  }

  return (
    <EuiCheckbox
      id={`${rowIndex}`}
      aria-label={`Select row ${rowIndex}, ${rows[rowIndex]._id}`}
      checked={isChecked}
      onChange={(e) => {
        if (e.target.checked) {
          selected.set(id, {
            id,
            added: new Date().toJSON(),
            record: record as ElasticSearchHit,
          });
        } else {
          selected.delete(id);
        }
        setSelected(new Map(selected));
      }}
    />
  );
};

export function DiscoverGridSelection({
  selected,
  onClose,
}: {
  selected: DiscoverGridSelection;
  onClose: () => void;
}) {
  const rows = [...selected.values()].map((entry) => {
    return entry.record;
  });
  return (
    <EuiPortal>
      <EuiFlyout onClose={() => onClose()} size="m">
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="s" className="dscTable__flyoutHeader">
                <h2>
                  <EuiIcon type="folderOpen" size="m" />{' '}
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
          {rows.length > 0 &&
            rows.map((row) => (
              <div key={row._id}>
                <EuiAccordion
                  id={String(row._id)}
                  buttonContent={`_id: ${row._id}`}
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
                    <JsonCodeBlock hit={row} />
                  </div>
                </EuiAccordion>
                <EuiSpacer size="m" />
              </div>
            ))}
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
