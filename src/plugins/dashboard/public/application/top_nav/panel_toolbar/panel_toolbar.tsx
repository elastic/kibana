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

import './panel_toolbar.scss';
import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  /** The click handler for the Add Panel button for creating new panels */
  onAddPanelClick: () => void;
  /** The click handler for the Library button for adding existing visualizations/embeddables */
  onLibraryClick: () => void;
}

export const PanelToolbar: FC<Props> = ({ onAddPanelClick, onLibraryClick }) => (
  <EuiFlexGroup className="panelToolbar" id="kbnDashboard__panelToolbar" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiButton
        fill
        size="s"
        iconType="plusInCircleFilled"
        onClick={onAddPanelClick}
        data-test-subj="addVisualizationButton"
      >
        {i18n.translate('dashboard.panelToolbar.addPanelButtonLabel', {
          defaultMessage: 'Create panel',
        })}
      </EuiButton>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton
        size="s"
        color="text"
        className="panelToolbarButton"
        iconType="folderOpen"
        onClick={onLibraryClick}
      >
        {i18n.translate('dashboard.panelToolbar.libraryButtonLabel', {
          defaultMessage: 'Add from library',
        })}
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
