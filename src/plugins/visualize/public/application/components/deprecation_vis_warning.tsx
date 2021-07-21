/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { useKibana } from '../../../../kibana_react/public';
import { VisualizeServices } from '../types';

export const LEGACY_CHARTS_LIBRARY = 'visualization:visualize:legacyChartsLibrary';

export const DeprecationWarning = () => {
  const { services } = useKibana<VisualizeServices>();
  const canEditAdvancedSettings = services.application.capabilities.advancedSettings.save;
  const advancedSettingsLink = services.application.getUrlForApp('management', {
    path: `/kibana/settings?query=${LEGACY_CHARTS_LIBRARY}`,
  });

  return (
    <EuiCallOut
      data-test-subj="vizDeprecationWarning"
      title={
        <FormattedMessage
          id="visualize.legacyCharts.notificationMessage"
          defaultMessage="You are using the legacy charts library, which will be removed in 7.16. {conditionalMessage}"
          values={{
            conditionalMessage: (
              <>
                {canEditAdvancedSettings && (
                  <FormattedMessage
                    id="visualize.legacyCharts.conditionalMessage.newLibrary"
                    defaultMessage="Switch to the new library in {link}"
                    values={{
                      link: (
                        <EuiLink href={advancedSettingsLink}>
                          <FormattedMessage
                            id="visualize.legacyCharts.conditionalMessage.advanced settings link"
                            defaultMessage="Advanced Settings."
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                )}
                {!canEditAdvancedSettings && (
                  <FormattedMessage
                    id="visualize.legacyCharts.conditionalMessage.noPermissions"
                    defaultMessage="Contact your system administrator to switch to the new library."
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
