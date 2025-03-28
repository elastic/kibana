/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { RowControlComponent, RowControlRowProps } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import { getSecurityTimelineRedirectUrl } from '../../utils';
import { exploreRowActionLabel } from '../../translations';

export interface ExploreInSecurityProps {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
  services: ProfileProviderServices;
}

export function ExploreInSecurity({ Control, rowProps, services }: ExploreInSecurityProps) {
  const hit = rowProps.record;
  const {
    application: { getUrlForApp, navigateToUrl },
  } = services;

  const timelinesURL = getUrlForApp('securitySolutionUI', {
    path: 'alerts',
  });

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

  const url = useMemo(() => (isAlert ? alertURL : eventURL), [isAlert, alertURL, eventURL]);

  const onControlClick = useCallback(() => {
    navigateToUrl(url);
  }, [url, navigateToUrl]);

  const label = useMemo(() => exploreRowActionLabel(isAlert), [isAlert]);
  return (
    <Control
      data-test-subj="explore-in-security"
      iconType="logoSecurity"
      label={label}
      tooltipContent={label}
      href={url}
      onClick={onControlClick}
    />
  );
}
