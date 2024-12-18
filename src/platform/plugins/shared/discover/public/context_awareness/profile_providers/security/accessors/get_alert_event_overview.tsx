/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { FC, PropsWithChildren } from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import { DocViewerComponent } from '@kbn/unified-doc-viewer/src/services/types';
import {
  EuiTitle,
  EuiSpacer,
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { EcsFlat } from '@elastic/ecs';
import * as i18n from '../translations';
import { getSecurityTimelineRedirectUrl } from '../utils';

export interface AllowedValue {
  description?: string;
  expected_event_types?: string[];
  name?: string;
}

/**
 * Helper function to return the description of an allowed value of the specified field
 * @param fieldName
 * @param value
 * @returns ecs description of the value
 */
export const getEcsAllowedValueDescription = (value: string): string => {
  const allowedValues: AllowedValue[] = EcsFlat['event.category']?.allowed_values ?? [];
  const result =
    allowedValues?.find((item) => item.name === value)?.description ?? i18n.noEcsDescriptionReason;
  return result;
};

export const ExpandableSection: FC<PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => {
  const [trigger, setTrigger] = useState<'open' | 'closed'>('open');

  const onToggle = (isOpen: boolean) => {
    const newState = isOpen ? 'open' : 'closed';
    setTrigger(newState);
  };

  return (
    <EuiAccordion
      forceState={trigger}
      onToggle={onToggle}
      buttonContent={
        <EuiTitle size="xs" data-test-subj={`expandableHeader`}>
          <h4>{title}</h4>
        </EuiTitle>
      }
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize={'m'} direction="column" data-test-subj={'expandableContent'}>
        {children}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

export const AlertEventOverview: DocViewerComponent = ({ hit }) => {
  const reason = useMemo(() => getFieldValue(hit, 'kibana.alert.reason') as string, [hit]);
  const alertURL = useMemo(() => getFieldValue(hit, 'kibana.alert.url') as string, [hit]);
  const eventKind = useMemo(() => getFieldValue(hit, 'event.kind') as string, [hit]);
  const isAlert = useMemo(() => eventKind === 'signal', [eventKind]);
  const eventId = useMemo(() => getFieldValue(hit, '_id') as string, [hit]);
  const eventURL = useMemo(
    () =>
      getSecurityTimelineRedirectUrl({
        from: getFieldValue(hit, '@timestamp') as string,
        to: getFieldValue(hit, '@timestamp') as string,
        eventId: eventId as string,
        index: getFieldValue(hit, '_index') as string,
      }),
    [hit, eventId]
  );

  const eventCategory = useMemo(() => getFieldValue(hit, 'event.category') as string, [hit]);

  return (
    <EuiFlexGroup
      data-test-subj={isAlert ? 'alertOverview' : 'eventOverview'}
      gutterSize="m"
      direction="column"
      style={{ paddingBlock: '20px' }}
    >
      <EuiFlexItem>
        <ExpandableSection title={'About'}>
          <EuiText data-test-subj="about">{getEcsAllowedValueDescription(eventCategory)}</EuiText>
        </ExpandableSection>
      </EuiFlexItem>
      {isAlert ? (
        <EuiFlexItem>
          <ExpandableSection title={'Reason'}>
            <EuiText data-test-subj="reason">{reason}</EuiText>
          </ExpandableSection>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="exploreSecurity"
          href={isAlert ? alertURL : eventURL}
          target="_blank"
          iconType="link"
          fill
          aria-label={i18n.overviewExploreButtonLabel(isAlert)}
        >
          {i18n.overviewExploreButtonLabel(isAlert)}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
