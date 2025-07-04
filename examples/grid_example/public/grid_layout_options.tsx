/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiButton, EuiButtonGroup, EuiFormRow, EuiPopover, EuiRange } from '@elastic/eui';
import { GridSettings } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/presentation-publishing';
import { MockDashboardApi } from './types';

export const GridLayoutOptions = ({
  viewMode,
  mockDashboardApi,
  gridSettings,
  setGridSettings,
}: {
  viewMode: ViewMode;
  mockDashboardApi: MockDashboardApi;
  gridSettings: GridSettings;
  setGridSettings: (settings: GridSettings) => void;
}) => {
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsSettingsPopoverOpen(!isSettingsPopoverOpen)}
        >
          {i18n.translate('examples.gridExample.settingsPopover.title', {
            defaultMessage: 'Layout settings',
          })}
        </EuiButton>
      }
      isOpen={isSettingsPopoverOpen}
      closePopover={() => setIsSettingsPopoverOpen(false)}
    >
      <>
        <EuiFormRow
          label={i18n.translate('examples.gridExample.settingsPopover.viewMode', {
            defaultMessage: 'View mode',
          })}
        >
          <EuiButtonGroup
            legend={i18n.translate('examples.gridExample.layoutOptionsLegend', {
              defaultMessage: 'Layout options',
            })}
            options={[
              {
                id: 'view',
                label: i18n.translate('examples.gridExample.viewOption', {
                  defaultMessage: 'View',
                }),
                toolTipContent:
                  'The layout adjusts when the window is resized. Panel interactivity, such as moving and resizing within the grid, is disabled.',
              },
              {
                id: 'edit',
                label: i18n.translate('examples.gridExample.editOption', {
                  defaultMessage: 'Edit',
                }),
                toolTipContent: 'The layout does not adjust when the window is resized.',
              },
            ]}
            idSelected={viewMode}
            onChange={(id) => {
              mockDashboardApi.setViewMode(id as ViewMode);
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('examples.gridExample.settingsPopover.gutterSize', {
            defaultMessage: 'Gutter size',
          })}
        >
          <EuiRange
            min={1}
            max={30}
            value={gridSettings.gutterSize}
            onChange={(e) =>
              setGridSettings({ ...gridSettings, gutterSize: parseInt(e.currentTarget.value, 10) })
            }
            showLabels
            showValue
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('examples.gridExample.settingsPopover.rowHeight', {
            defaultMessage: 'Row height',
          })}
        >
          <EuiRange
            min={5}
            max={30}
            step={5}
            value={gridSettings.rowHeight}
            onChange={(e) =>
              setGridSettings({ ...gridSettings, rowHeight: parseInt(e.currentTarget.value, 10) })
            }
            showLabels
            showValue
          />
        </EuiFormRow>
      </>
    </EuiPopover>
  );
};
