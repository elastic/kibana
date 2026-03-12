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

/** Calendar-based date selection panel. */
export function CalendarPanel() {
  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>Calendar</SubPanelHeading>
      </PanelHeader>
    </PanelContainer>
  );
}
CalendarPanel.PANEL_ID = 'calendar-panel';
