/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiForm, EuiFormRow, EuiSwitch } from '@elastic/eui';
import { useDashboardContainerContext } from '../../../dashboard_container_renderer';

export const DashboardOptions = () => {
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setUseMargins, setSyncCursor, setSyncColors, setSyncTooltips, setHidePanelTitles },
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  const useMargins = select((state) => state.explicitInput.useMargins);
  const syncColors = select((state) => state.explicitInput.syncColors);
  const syncCursor = select((state) => state.explicitInput.syncCursor);
  const syncTooltips = select((state) => state.explicitInput.syncTooltips);
  const hidePanelTitles = select((state) => state.explicitInput.hidePanelTitles);

  return (
    <EuiForm data-test-subj="dashboardOptionsMenu">
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('dashboard.topNav.options.useMarginsBetweenPanelsSwitchLabel', {
            defaultMessage: 'Use margins between panels',
          })}
          checked={useMargins}
          onChange={(event) => dispatch(setUseMargins(event.target.checked))}
          data-test-subj="dashboardMarginsCheckbox"
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('dashboard.topNav.options.hideAllPanelTitlesSwitchLabel', {
            defaultMessage: 'Show panel titles',
          })}
          checked={!hidePanelTitles}
          onChange={(event) => dispatch(setHidePanelTitles(!event.target.checked))}
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
              checked={syncColors}
              onChange={(event) => dispatch(setSyncColors(event.target.checked))}
              data-test-subj="dashboardSyncColorsCheckbox"
            />
          </EuiFormRow>
          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('dashboard.topNav.options.syncCursorBetweenPanelsSwitchLabel', {
                defaultMessage: 'Sync cursor across panels',
              })}
              checked={syncCursor}
              onChange={(event) => dispatch(setSyncCursor(event.target.checked))}
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
              checked={syncTooltips}
              disabled={!Boolean(syncCursor)}
              onChange={(event) => dispatch(setSyncTooltips(event.target.checked))}
              data-test-subj="dashboardSyncTooltipsCheckbox"
            />
          </EuiFormRow>
        </>
      </EuiFormRow>
    </EuiForm>
  );
};
