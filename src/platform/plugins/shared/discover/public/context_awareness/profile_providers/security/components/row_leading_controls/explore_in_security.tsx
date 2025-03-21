/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { RowControlComponent, RowControlRowProps, getFieldValue } from '@kbn/discover-utils';
import { ProfileProviderServices } from '../../../profile_provider_services';
import { getSecurityTimelineRedirectUrl } from '../../utils';

export interface ExploreInSecurityProps {
  Control: RowControlComponent;
  rowProps: RowControlRowProps;
  services: ProfileProviderServices;
}

export function ExploreInSecurity({ Control, rowProps, services }: ExploreInSecurityProps) {
  const hit = rowProps.record;
  const {
    application: { getUrlForApp },
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
    window.open(url, '_blank');
  }, [url]);

  const label = useMemo(() => `Explore ${isAlert ? 'alert' : 'event'} in Security`, [isAlert]);
  return (
    <Control
      iconType="logoSecurity"
      label={label}
      onClick={onControlClick}
      tooltipContent={label}
    />
  );
}
