/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import type { DocViewerComponent } from '@kbn/unified-doc-viewer/types';
import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { AlertDescription, MitreAttack, Reason } from '@kbn/security-solution-flyout';
import * as i18n from '../translations';
import { getSecurityTimelineRedirectUrl } from '../utils';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

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
      id={`accordion-${title}`}
      forceState={trigger}
      onToggle={onToggle}
      buttonContent={
        <EuiTitle size="xs" data-test-subj={`expandableHeader-${title}`}>
          <h4>{title}</h4>
        </EuiTitle>
      }
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup
        gutterSize={'m'}
        direction="column"
        data-test-subj={`expandableContent-${title}`}
      >
        {children}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};

export const AlertEventOverview: DocViewerComponent = ({ hit }) => {
  const {
    application: { getUrlForApp },
  } = useDiscoverServices();

  const timelinesURL = getUrlForApp('securitySolutionUI', {
    path: 'alerts',
  });

  const openRulePreview = useCallback(() => console.log('Open Rule Preview'), []);
  const openReason = useCallback(() => console.log('Open Reason'), []);

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
        baseURL: timelinesURL,
      }),
    [hit, eventId, timelinesURL]
  );

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiSpacer size="m" />
      <EuiFlexGroup
        data-test-subj={isAlert ? 'alertOverview' : 'eventOverview'}
        gutterSize="m"
        direction="column"
      >
        <EuiFlexItem>
          <ExpandableSection title={i18n.aboutSectionTitle}>
            {isAlert ? (
              <EuiFlexGroup gutterSize="m" direction="column">
                <EuiFlexItem>
                  <AlertDescription
                    hit={hit}
                    onShowRuleSummary={openRulePreview}
                    ruleSummaryDisabled={true}
                  />
                </EuiFlexItem>

                <EuiFlexItem>
                  <Reason hit={hit} onOpenReason={openReason} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <MitreAttack hit={hit} />
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
          </ExpandableSection>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="exploreSecurity"
            href={isAlert && alertURL ? alertURL : eventURL}
            target="_blank"
            iconType="link"
            fill
            aria-label={i18n.overviewExploreButtonLabel(isAlert)}
          >
            {i18n.overviewExploreButtonLabel(isAlert)}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
