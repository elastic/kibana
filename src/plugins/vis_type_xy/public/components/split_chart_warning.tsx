/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FC } from 'react';

import { EuiLink, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { getDocLinks } from '../services';

export const SplitChartWarning: FC = () => {
  const advancedSettingsLink = getDocLinks().links.management.visualizationSettings;

  return (
    <EuiCallOut
      title={i18n.translate('visTypeXy.splitChartWarning.title', {
        defaultMessage: 'Warning',
      })}
      color="warning"
      iconType="help"
    >
      <FormattedMessage
        id="visTypeXy.splitChartWarning.content"
        defaultMessage="The new charts library does not support split chart aggregation. Please enable the {link} advanced setting to use split chart aggregation."
        values={{
          link: (
            <EuiLink href={advancedSettingsLink} target="_blank" external>
              <FormattedMessage
                id="visTypeXy.splitChartWarning.link"
                defaultMessage="Legacy charts library"
              />
            </EuiLink>
          ),
        }}
      />
    </EuiCallOut>
  );
};
