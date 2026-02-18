/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';

import {
  PanelContainer,
  PanelHeader,
  PanelBody,
  PanelBodySection,
} from '../date_range_picker_panel_ui';
import { useDateRangePickerPanelNavigation } from '../date_range_picker_panel_navigation';

export function MainPanel() {
  const { navigateTo } = useDateRangePickerPanelNavigation();

  return (
    <PanelContainer>
      <PanelHeader spacingSide="both">
        <h1>Main panel</h1>
      </PanelHeader>
      <PanelBody>
        <PanelBodySection>
          <EuiButton size="s" fullWidth onClick={() => navigateTo('example-panel')}>
            Example panel
          </EuiButton>
        </PanelBodySection>
      </PanelBody>
    </PanelContainer>
  );
}
