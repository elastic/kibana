/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo, useState } from 'react';
import { fieldConstants, getFieldValue } from '@kbn/discover-utils';
import type { DocViewerComponent } from '@kbn/unified-doc-viewer/types';
import { isNonLocalIndexName } from '@kbn/es-query';
import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as i18n from '../translations';
import { getSecurityTimelineRedirectUrl } from '../utils';
import { getEcsAllowedValueDescription } from '../utils/ecs_description';
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
    fieldsMetadata,
  } = useDiscoverServices();

  const timelinesURL = getUrlForApp('securitySolutionUI', {
    path: 'alerts',
  });

  const result = fieldsMetadata?.useFieldsMetadata({
    attributes: ['allowed_values', 'name', 'flat_name'],
    fieldNames: [fieldConstants.EVENT_CATEGORY_FIELD],
  });

  const reason = useMemo(() => getFieldValue(hit, 'kibana.alert.reason') as string, [hit]);
  const description = useMemo(
    () => getFieldValue(hit, 'kibana.alert.rule.description') as string,
    [hit]
  );
  const eventKind = useMemo(() => getFieldValue(hit, 'event.kind') as string, [hit]);
  const isAlert = useMemo(() => eventKind === 'signal', [eventKind]);

  const exploreUrl = useMemo(() => {
    const documentId = getFieldValue(hit, '_id') as string;

    // Returning the url if it exists here assumes that url will be correctly containg the linked project (for linked alerts).
    // This way we can navigate to the alerts page and open the flyout (either on the local or the linked project).
    const alertURL = getFieldValue(hit, 'kibana.alert.url') as string | undefined;
    if (alertURL) return alertURL;

    // If the url is not populated, we fall back opening Timeline, but this will not work for remote indices as
    // Timeline should not read from linked project (at least during Tech Preview)
    const index = getFieldValue(hit, '_index') as string | undefined;
    if (isNonLocalIndexName(index ?? '')) return undefined;

    // This will only be reached for local alerts that don't have the `kibana.alert.url` or all local events.
    return getSecurityTimelineRedirectUrl({
      from: getFieldValue(hit, '@timestamp') as string,
      to: getFieldValue(hit, '@timestamp') as string,
      eventId: documentId as string,
      index: index as string,
      baseURL: timelinesURL,
    });
  }, [hit, timelinesURL]);

  const eventCategory = useMemo(() => getFieldValue(hit, 'event.category') as string, [hit]);

  return (
    <EuiFlexGroup
      data-test-subj={isAlert ? 'alertOverview' : 'eventOverview'}
      gutterSize="m"
      direction="column"
      style={{ paddingBlock: '20px' }}
    >
      <EuiFlexItem>
        <ExpandableSection title={i18n.aboutSectionTitle}>
          {result?.loading ? (
            <EuiSkeletonText
              lines={2}
              size={'s'}
              isLoading={result?.loading}
              contentAriaLabel={i18n.ecsDescriptionLoadingAriaLable}
            />
          ) : (
            <EuiText size="s" data-test-subj="about">
              {getEcsAllowedValueDescription(result?.fieldsMetadata, eventCategory)}
            </EuiText>
          )}
        </ExpandableSection>
      </EuiFlexItem>
      {description ? (
        <EuiFlexItem>
          <ExpandableSection title={i18n.descriptionSectionTitle}>
            <EuiText size="s" data-test-subj="description">
              {description}
            </EuiText>
          </ExpandableSection>
        </EuiFlexItem>
      ) : null}
      {isAlert ? (
        <EuiFlexItem>
          <ExpandableSection title={i18n.reasonSectionTitle}>
            <EuiText size="s" data-test-subj="reason">
              {reason}
            </EuiText>
          </ExpandableSection>
        </EuiFlexItem>
      ) : null}
      {exploreUrl && (
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="exploreSecurity"
            href={exploreUrl}
            target="_blank"
            iconSide="right"
            iconType="external"
            fill
            aria-label={i18n.overviewExploreButtonLabel(isAlert)}
          >
            {i18n.overviewExploreButtonLabel(isAlert)}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
