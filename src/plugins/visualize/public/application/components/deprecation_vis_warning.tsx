/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { getCoreStart } from '../../services';

export const LEGACY_CHARTS_LIBRARY = 'visualization:visualize:legacyChartsLibrary';

export const DeprecationWarning = () => {
  const documentationLink = useMemo(
    () => getCoreStart().docLinks.links.visualize.aggregationBased,
    []
  );
  const canEditAdvancedSettings = getCoreStart().application.capabilities.advancedSettings.save;
  const advancedSettingsLink = getCoreStart().http.basePath.prepend(
    `/app/management/kibana/settings?query=${LEGACY_CHARTS_LIBRARY}`
  );

  return (
    <EuiCallOut
      data-test-subj="vizDeprecationWarning"
      title={
        <FormattedMessage
          id="visualize.legacyCharts.notificationMessage"
          defaultMessage="You are using the legacy XY charts library which will be removed in the next minor release, 7.16, after being deprecated in 7.12. {advancedSettingsMessage} Check our documentation {documentationLink}"
          values={{
            advancedSettingsMessage: (
              <>
                {canEditAdvancedSettings && (
                  <FormattedMessage
                    id="visualize.legacyCharts.advancedSettingsMessage.newLibrary"
                    defaultMessage="Switch to the new library {link}"
                    values={{
                      link: (
                        <EuiLink href={advancedSettingsLink}>
                          <FormattedMessage
                            id="visualize.legacyCharts.advancedSettingsMessage.linkText"
                            defaultMessage="in your advanced settings."
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                )}
                {!canEditAdvancedSettings && (
                  <FormattedMessage
                    id="visualize.legacyCharts.advancedSettingsMessage.noPermissions"
                    defaultMessage="To switch to the new library in your advanced settings, contact your administrator."
                  />
                )}
              </>
            ),
            documentationLink: (
              <EuiLink href={documentationLink} target="_blank" external>
                <FormattedMessage
                  id="visualize.legacyCharts.documentationLink"
                  defaultMessage="here."
                />
              </EuiLink>
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
