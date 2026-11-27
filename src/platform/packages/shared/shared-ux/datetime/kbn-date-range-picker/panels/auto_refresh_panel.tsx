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
  PanelBody,
  PanelBodySection,
  PanelContainer,
  PanelFooter,
  PanelHeader,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { RefreshInterval } from '../refresh_interval/refresh_interval';
import { useDateRangePickerContext } from '../date_range_picker_context';
import { autoRefreshPanelTexts, mainPanelTexts } from '../translations';

/** Auto-refresh panel, reached from the main panel nav. */
export function AutoRefreshPanel() {
  const {
    autoRefresh,
    onAutoRefreshChange,
    isAutoRefreshReadOnly,
    autoRefreshMinIntervalMs,
    setIsEditing,
  } = useDateRangePickerContext();

  const doneButton = (
    <EuiButton
      size="s"
      fill
      onClick={() => setIsEditing(false)}
      data-test-subj="dateRangePickerAutoRefreshDoneButton"
    >
      {autoRefreshPanelTexts.doneButton}
    </EuiButton>
  );

  return (
    <PanelContainer data-test-subj="dateRangePickerAutoRefreshPanel">
      <PanelHeader>
        <SubPanelHeading>{mainPanelTexts.autoRefreshPanelTitle}</SubPanelHeading>
      </PanelHeader>
      <PanelBody spacingSide="both">
        <PanelBodySection>
          {autoRefresh ? (
            <RefreshInterval
              value={autoRefresh}
              onChange={onAutoRefreshChange}
              minIntervalMs={autoRefreshMinIntervalMs}
              readOnly={isAutoRefreshReadOnly}
            />
          ) : null}
        </PanelBodySection>
      </PanelBody>
      <PanelFooter primaryAction={doneButton} />
    </PanelContainer>
  );
}
AutoRefreshPanel.PANEL_ID = 'auto-refresh-panel';
