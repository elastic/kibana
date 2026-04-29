/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import { FancySelect } from '../../../../components/fancy_select';

export type Format = 'encoded' | 'beats' | 'logstash';

export interface FormatSelectProps {
  value: Format;
  onChange: (value: Format) => void;
}

export const FormatSelect: React.FC<FormatSelectProps> = ({ value, onChange }) => {
  return (
    <FancySelect
      value={value}
      ariaLabel={i18n.translate('cloud.connectionDetails.components.formatSelect.ariaLabel', {
        defaultMessage: 'API key format',
      })}
      options={[
        {
          id: 'encoded',
          icon: 'key',
          title: i18n.translate('cloud.connectionDetails.apiKeyFormat.encoded.title', {
            defaultMessage: 'Encoded',
          }),
          description: i18n.translate('cloud.connectionDetails.apiKeyFormat.encoded.description', {
            defaultMessage: 'Use to make requests to Elasticsearch REST API',
          }),
        },
        {
          id: 'beats',
          icon: 'logoBeats',
          title: i18n.translate('cloud.connectionDetails.apiKeyFormat.beats.title', {
            defaultMessage: 'Beats',
          }),
          description: i18n.translate('cloud.connectionDetails.apiKeyFormat.beats.description', {
            defaultMessage: 'Use to configure Beats',
          }),
        },
        {
          id: 'logstash',
          icon: 'logoLogstash',
          title: i18n.translate('cloud.connectionDetails.apiKeyFormat.logstash.title', {
            defaultMessage: 'Logstash',
          }),
          description: i18n.translate('cloud.connectionDetails.apiKeyFormat.logstash.description', {
            defaultMessage: 'Use to configure Logstash',
          }),
        },
      ]}
      onChange={(newValue) => onChange(newValue as Format)}
    />
  );
};
