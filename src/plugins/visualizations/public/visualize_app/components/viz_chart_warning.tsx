/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { VisualizeServices } from '../types';
import {
  CHARTS_WITHOUT_SMALL_MULTIPLES,
  CHARTS_TO_BE_DEPRECATED,
} from '../utils/split_chart_warning_helpers';
import type {
  CHARTS_WITHOUT_SMALL_MULTIPLES as CHART_WITHOUT_SMALL_MULTIPLES,
  CHARTS_TO_BE_DEPRECATED as CHART_TO_BE_DEPRECATED,
} from '../utils/split_chart_warning_helpers';

interface Props {
  chartType: CHART_WITHOUT_SMALL_MULTIPLES | CHART_TO_BE_DEPRECATED;
  chartConfigToken: string;
  mode?: 'old' | 'new';
}

interface WarningMessageProps {
  canEditAdvancedSettings: boolean | Readonly<{ [x: string]: boolean }>;
  advancedSettingsLink: string;
  mode?: 'old' | 'new';
}

const SwitchToOldLibraryMessage: FC<WarningMessageProps> = ({
  canEditAdvancedSettings,
  advancedSettingsLink,
  mode = 'old',
}) => {
  return (
    <>
      {canEditAdvancedSettings && (
        <FormattedMessage
          id="visualizations.newChart.conditionalMessage.newLibrary"
          defaultMessage="Switch to the {type} library in {link}"
          values={{
            link: (
              <EuiLink href={advancedSettingsLink}>
                <FormattedMessage
                  id="visualizations.newChart.conditionalMessage.advancedSettingsLink"
                  defaultMessage="Advanced Settings."
                />
              </EuiLink>
            ),
            type:
              mode === 'old'
                ? i18n.translate('visualizations.newChart.libraryMode.old', {
                    defaultMessage: 'old',
                  })
                : i18n.translate('visualizations.newChart.libraryMode.new', {
                    defaultMessage: 'new',
                  }),
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

const PieWarningFormatMessage: FC<WarningMessageProps> = (props) => {
  return (
    <FormattedMessage
      id="visualizations.oldPieChart.notificationMessage"
      defaultMessage="You are using the legacy charts library, which will be removed in a future version. {conditionalMessage}"
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

const TimelionWarningFormatMessage: FC<WarningMessageProps> = (props) => {
  return (
    <FormattedMessage
      id="visualizations.oldTimelionChart.notificationMessage"
      defaultMessage="You are using the legacy charts library, which will be removed in a future version. {conditionalMessage}"
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
  [CHARTS_TO_BE_DEPRECATED.pie]: PieWarningFormatMessage,
  [CHARTS_TO_BE_DEPRECATED.timelion]: TimelionWarningFormatMessage,
};

export const VizChartWarning: FC<Props> = ({ chartType, chartConfigToken, mode }) => {
  const { services } = useKibana<VisualizeServices>();
  const canEditAdvancedSettings = services.application.capabilities.advancedSettings.save;
  const advancedSettingsLink = services.application.getUrlForApp('management', {
    path: `/kibana/settings?query=${chartConfigToken}`,
  });

  const WarningMessage = warningMessages[chartType];
  return (
    <EuiCallOut
      data-test-subj="vizChartWarning"
      title={
        <WarningMessage
          advancedSettingsLink={advancedSettingsLink}
          canEditAdvancedSettings={canEditAdvancedSettings}
          mode={mode}
        />
      }
      iconType="alert"
      color="warning"
      size="s"
    />
  );
};
