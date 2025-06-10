/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { CasesPublicStartDependencies } from '@kbn/cases-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

interface ReadOnlyTimeRangeProps {
  timeRange: TimeRange;
}

export const ReadOnlyTimeRange: React.FC<ReadOnlyTimeRangeProps> = ({ timeRange }) => {
  const {
    settings: { client: settingsClient },
  } = useKibana<CoreStart & CasesPublicStartDependencies>().services; // Component is rendered with the cases app. Type for Kibana services must match CasesPublicStartDependencies
  const timeZoneGuess = moment.tz.guess();
  const dateFormat = settingsClient.get('dateFormat');
  const dateFormatTZ = settingsClient.get('dateFormat:tz');
  const appliedTimeZone = dateFormatTZ === 'Browser' ? timeZoneGuess : dateFormatTZ;
  const currentTZFromFormatter = moment.tz(timeRange.from, appliedTimeZone);
  const utcFromFormatter = moment.tz(timeRange.from, 'UTC');
  const currentTZToFormatter = moment.tz(timeRange.to, appliedTimeZone);
  const utcToFormatter = moment.tz(timeRange.to, 'UTC');
  const fromCurrentTZ = currentTZFromFormatter.format(dateFormat);
  const toCurrentTZ = currentTZToFormatter.format(dateFormat);
  const fromUTC = utcFromFormatter.format(dateFormat);
  const toUTC = utcToFormatter.format(dateFormat);

  return (
    <EuiToolTip
      content={i18n.translate('discover.cases.attachment.timeRangeTooltip', {
        defaultMessage: 'From: {fromUTC} to {toUTC} (UTC)',
        values: { fromUTC, toUTC },
      })}
    >
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{TIME_RANGE_LABEL}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="success">
            {i18n.translate('discover.cases.attachment.timeRangeDisplay', {
              defaultMessage: '{fromCurrentTZ} to {toCurrentTZ}',
              values: { fromCurrentTZ, toCurrentTZ },
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

const TIME_RANGE_LABEL = i18n.translate('discover.cases.attachment.timeRangeLabel', {
  defaultMessage: 'Time range',
});
