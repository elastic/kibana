/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiLink, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { DocLinksStart } from 'src/core/public';

interface SplitChartWarningProps {
  docLinks: DocLinksStart;
}

export function SplitChartWarning({ docLinks }: SplitChartWarningProps) {
  const advancedSettingsLink = docLinks.links.management.visualizationSettings;

  return (
    <I18nProvider>
      <EuiCallOut
        title={i18n.translate('visTypeHeatmap.splitChartWarning.title', {
          defaultMessage: 'Warning',
        })}
        color="warning"
        iconType="help"
      >
        <FormattedMessage
          id="visTypeHeatmap.splitChartWarning.content"
          defaultMessage="The new charts library does not yet support split chart aggregation. Please enable the {link} advanced setting to use split chart aggregation."
          values={{
            link: (
              <EuiLink href={advancedSettingsLink} target="_blank" external>
                <FormattedMessage
                  id="visTypeHeatmap.splitChartWarning.link"
                  defaultMessage="Heatmap legacy charts library"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
    </I18nProvider>
  );
}
