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
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DiscoverGridContext } from './discover_grid_context';

export const ViewButton = ({ rowIndex }: { rowIndex: number }) => {
  const { expanded, setExpanded, rows } = useContext(DiscoverGridContext);

  const current = rows[rowIndex];
  const isCurrentRowExpanded = current === expanded;

  return (
    <button
      aria-label={i18n.translate('discover.grid.viewDoc', {
        defaultMessage: 'Toggle dialog with details',
      })}
      onClick={() => setExpanded(isCurrentRowExpanded ? undefined : current)}
      className="dscTable__buttonToggle"
      data-test-subj="docTableExpandToggleColumn"
    >
      <EuiIcon size="s" type={isCurrentRowExpanded ? 'expandMini' : 'expand'} />
    </button>
  );
};
