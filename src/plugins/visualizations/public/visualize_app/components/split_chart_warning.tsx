/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useKibana } from '../../../../kibana_react/public';
import { VisualizeServices } from '../types';
import { CHARTS_WITHOUT_SMALL_MULTIPLES } from '../utils/split_chart_warning_helpers';
import type { CHARTS_WITHOUT_SMALL_MULTIPLES as CHART_WITHOUT_SMALL_MULTIPLES } from '../utils/split_chart_warning_helpers';

interface Props {
  chartType: CHART_WITHOUT_SMALL_MULTIPLES;
  chartConfigToken: string;
}

interface WarningMessageProps {
  canEditAdvancedSettings: boolean | Readonly<{ [x: string]: boolean }>;
  advancedSettingsLink: string;
}

const SwitchToOldLibraryMessage: FC<WarningMessageProps> = ({
  canEditAdvancedSettings,
  advancedSettingsLink,
}) => {
  return (
    <>
      {canEditAdvancedSettings && (
        <FormattedMessage
          id="visualizations.newChart.conditionalMessage.newLibrary"
          defaultMessage="Switch to the old library in {link}"
          values={{
            link: (
              <EuiLink href={advancedSettingsLink}>
                <FormattedMessage
                  id="visualizations.newChart.conditionalMessage.advancedSettingsLink"
                  defaultMessage="Advanced Settings."
                />
              </EuiLink>
            ),
          }}
        />
      )}
    </>
  );
};

const ContactAdminMessage: FC<WarningMessageProps> = ({ canEditAdvancedSettings }) => {
  return (
    <>
      {!canEditAdvancedSettings && (
        <FormattedMessage
          id="visualizations.legacyCharts.conditionalMessage.noPermissions"
          defaultMessage="Contact your system administrator to switch to the old library."
        />
      )}
    </>
  );
};

const GaugeWarningFormatMessage: FC<WarningMessageProps> = (props) => {
  return (
    <FormattedMessage
      id="visualizations.newGaugeChart.notificationMessage"
      defaultMessage="The new gauge charts library does not yet support split chart aggregation. {conditionalMessage}"
      values={{
        conditionalMessage: (
          <>
            <SwitchToOldLibraryMessage {...props} />
            <ContactAdminMessage {...props} />
          </>
        ),
      }}
    />
  );
};

const HeatmapWarningFormatMessage: FC<WarningMessageProps> = (props) => {
  return (
    <FormattedMessage
      id="visualizations.newHeatmapChart.notificationMessage"
      defaultMessage="The new heatmap charts library does not yet support split chart aggregation. {conditionalMessage}"
      values={{
        conditionalMessage: (
          <>
            <SwitchToOldLibraryMessage {...props} />
            <ContactAdminMessage {...props} />
          </>
        ),
      }}
    />
  );
};

const warningMessages = {
  [CHARTS_WITHOUT_SMALL_MULTIPLES.heatmap]: HeatmapWarningFormatMessage,
  [CHARTS_WITHOUT_SMALL_MULTIPLES.gauge]: GaugeWarningFormatMessage,
};

export const SplitChartWarning: FC<Props> = ({ chartType, chartConfigToken }) => {
  const { services } = useKibana<VisualizeServices>();
  const canEditAdvancedSettings = services.application.capabilities.advancedSettings.save;
  const advancedSettingsLink = services.application.getUrlForApp('management', {
    path: `/kibana/settings?query=${chartConfigToken}`,
  });

  const WarningMessage = warningMessages[chartType];
  return (
    <EuiCallOut
      data-test-subj="vizSplitChartWarning"
      title={
        <WarningMessage
          advancedSettingsLink={advancedSettingsLink}
          canEditAdvancedSettings={canEditAdvancedSettings}
        />
      }
      iconType="alert"
      color="warning"
      size="s"
    />
  );
};
