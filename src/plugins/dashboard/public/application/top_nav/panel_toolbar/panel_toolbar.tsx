/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
