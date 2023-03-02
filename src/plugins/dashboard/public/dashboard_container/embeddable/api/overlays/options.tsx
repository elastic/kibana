/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { DashboardContainerByValueInput } from '../../../../../common';

interface DashboardOptionsProps {
  initialInput: DashboardOptions;
  updateDashboardSetting: (newSettings: Partial<DashboardOptions>) => void;
}

type DashboardOptions = Pick<
  DashboardContainerByValueInput,
  'hidePanelTitles' | 'syncColors' | 'syncCursor' | 'syncTooltips' | 'useMargins'
>;

export const DashboardOptions = ({
  initialInput,
  updateDashboardSetting,
}: DashboardOptionsProps) => {
  return (
    <>
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('dashboard.topNav.options.useMarginsBetweenPanelsSwitchLabel', {
            defaultMessage: 'Use margins between panels',
          })}
          checked={initialInput.useMargins}
          onChange={(event) => updateDashboardSetting({ useMargins: event.target.checked })}
          data-test-subj="dashboardMarginsCheckbox"
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('dashboard.topNav.options.hideAllPanelTitlesSwitchLabel', {
            defaultMessage: 'Show panel titles',
          })}
          checked={!initialInput.hidePanelTitles}
          onChange={(event) => updateDashboardSetting({ hidePanelTitles: !event.target.checked })}
          data-test-subj="dashboardPanelTitlesCheckbox"
        />
      </EuiFormRow>
      <EuiFormRow label="Sync across panels">
        <>
          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('dashboard.topNav.options.syncColorsBetweenPanelsSwitchLabel', {
                defaultMessage: 'Sync color palettes across panels',
              })}
              checked={initialInput.syncColors}
              onChange={(event) => updateDashboardSetting({ syncColors: event.target.checked })}
              data-test-subj="dashboardSyncColorsCheckbox"
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('dashboard.topNav.options.syncCursorBetweenPanelsSwitchLabel', {
                defaultMessage: 'Sync cursor across panels',
              })}
              checked={initialInput.syncCursor}
              onChange={(event) => updateDashboardSetting({ syncCursor: event.target.checked })}
              data-test-subj="dashboardSyncCursorCheckbox"
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate(
                'dashboard.topNav.options.syncTooltipsBetweenPanelsSwitchLabel',
                {
                  defaultMessage: 'Sync tooltips across panels',
                }
              )}
              checked={initialInput.syncTooltips}
              disabled={!Boolean(initialInput.syncCursor)}
              onChange={(event) => updateDashboardSetting({ syncTooltips: event.target.checked })}
              data-test-subj="dashboardSyncTooltipsCheckbox"
            />
          </EuiFormRow>
        </>
      </EuiFormRow>
    </>
  );
};
