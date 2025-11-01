/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import {
  fieldConstants,
  getEventTypeFieldWithFallback,
  getLogLevelFieldWithFallback,
  type LogDocumentOverview,
} from '@kbn/discover-utils';
import { EuiFlexGroup } from '@elastic/eui';
import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import { HoverActionPopover } from '../hover_popover_action';
import { LogLevel } from './log_level';
import { EventType } from './event_type';
import { Timestamp } from './timestamp';

interface BadgesProps {
  hasMessageField: boolean;
  hit: DataTableRecord;
  formattedDoc: LogDocumentOverview;
  renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
}

export const Badges = ({ formattedDoc, hit, renderFlyoutStreamProcessingLink }: BadgesProps) => {
  const { field: logLevelField, value: logLevelValue } = getLogLevelFieldWithFallback(formattedDoc);
  const { field: eventTypeField, value: eventTypeValue } =
    getEventTypeFieldWithFallback(formattedDoc);

  const hasLogLevel = Boolean(logLevelValue);
  const isErrorEventType =
    Boolean(eventTypeValue) &&
    (eventTypeValue?.includes('error') || eventTypeValue?.includes('exception'));

  const timestampField = formattedDoc[fieldConstants.TIMESTAMP_FIELD];
  const hasTimestamp = Boolean(timestampField);

  const hasMessageField = Boolean(formattedDoc[fieldConstants.MESSAGE_FIELD]);

  const hasBadges = hasMessageField || hasLogLevel || isErrorEventType || hasTimestamp;

  return hasBadges ? (
    <EuiFlexGroup responsive={false} gutterSize="m" alignItems="center" wrap={true}>
      {hasMessageField &&
        renderFlyoutStreamProcessingLink &&
        renderFlyoutStreamProcessingLink({ doc: hit })}

      {hasLogLevel && logLevelField && (
        <HoverActionPopover value={logLevelValue} field={logLevelField}>
          <LogLevel level={logLevelValue} />
        </HoverActionPopover>
      )}

      {!hasLogLevel && isErrorEventType && eventTypeField && (
        <HoverActionPopover value={eventTypeValue} field={eventTypeField}>
          <EventType eventTypeValue={eventTypeValue} />
        </HoverActionPopover>
      )}

      {hasTimestamp && <Timestamp timestamp={timestampField} />}
    </EuiFlexGroup>
  ) : null;
};
