/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import React from 'react';
import { getDocLinks } from '../services';

export function DisabledLabVisualization({ title }: { title: string }) {
  const advancedSettingsLink = getDocLinks().links.management.visualizationSettings;
  return (
    <I18nProvider>
      <EuiEmptyPrompt
        titleSize="xs"
        title={
          <h6>
            <FormattedMessage
              id="visualizations.disabledLabVisualizationTitle"
              defaultMessage="{title} is a lab visualization."
              values={{ title }}
            />
          </h6>
        }
        iconType="beaker"
        body={
          <FormattedMessage
            id="visualizations.disabledLabVisualizationMessage"
            defaultMessage="Please turn on lab-mode in the advanced settings to see lab visualizations."
          />
        }
        actions={
          <EuiLink target="_blank" external href={advancedSettingsLink}>
            <FormattedMessage
              id="visualizations.disabledLabVisualizationLink"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        }
      />
    </I18nProvider>
  );
}
