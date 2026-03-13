/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { PanelContainer, PanelHeader, SubPanelHeading } from '../date_range_picker_panel_ui';

/** Panel for specifying a custom absolute or relative time range. */
export function CustomTimeRangePanel() {
  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>Custom time range</SubPanelHeading>
      </PanelHeader>
    </PanelContainer>
  );
}
CustomTimeRangePanel.PANEL_ID = 'custom-time-range-panel';
