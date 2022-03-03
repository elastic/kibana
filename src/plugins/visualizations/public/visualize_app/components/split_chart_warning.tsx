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
import { warningStrings } from '../utils/split_chart_warning_helpers';
import type { CHARTS_WITHOUT_SMALL_MULTIPLES } from '../utils/split_chart_warning_helpers';

interface Props {
  chartType: CHARTS_WITHOUT_SMALL_MULTIPLES;
  chartConfigToken: string;
}

export const SplitChartWarning: FC<Props> = ({ chartType, chartConfigToken }) => {
  const { services } = useKibana<VisualizeServices>();
  const canEditAdvancedSettings = services.application.capabilities.advancedSettings.save;
  const advancedSettingsLink = services.application.getUrlForApp('management', {
    path: `/kibana/settings?query=${chartConfigToken}`,
  });
  const message = warningStrings[chartType];

  return (
    <EuiCallOut
      data-test-subj="vizSplitChartWarning"
      title={
        <FormattedMessage
          {...message}
          values={{
            conditionalMessage: (
              <>
                {canEditAdvancedSettings && (
                  <FormattedMessage
                    id="visualizations.newHeatmapChart.conditionalMessage.newLibrary"
                    defaultMessage="Switch to the old library in {link}"
                    values={{
                      link: (
                        <EuiLink href={advancedSettingsLink}>
                          <FormattedMessage
                            id="visualizations.newHeatmapChart.conditionalMessage.advancedSettingsLink"
                            defaultMessage="Advanced Settings."
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                )}
                {!canEditAdvancedSettings && (
                  <FormattedMessage
                    id="visualizations.legacyCharts.conditionalMessage.noPermissions"
                    defaultMessage="Contact your system administrator to switch to the old library."
                  />
                )}
              </>
            ),
          }}
        />
      }
      iconType="alert"
      color="warning"
      size="s"
    />
  );
};
