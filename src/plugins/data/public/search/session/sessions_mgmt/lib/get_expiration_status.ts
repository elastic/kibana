/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { SearchSessionsConfigSchema } from '../../../../../config';

export const getExpirationStatus = (config: SearchSessionsConfigSchema, expires: string | null) => {
  const tNow = moment.utc().valueOf();
  const tFuture = moment.utc(expires).valueOf();

  // NOTE this could end up negative. If server time is off from the browser's clock
  // and the session was early expired when the browser refreshed the listing
  const durationToExpire = moment.duration(tFuture - tNow);
  const expiresInDays = Math.floor(durationToExpire.asDays());
  const sufficientDays = Math.ceil(moment.duration(config.management.expiresSoonWarning).asDays());

  let toolTipContent = i18n.translate('data.mgmt.searchSessions.status.expiresSoonInDays', {
    defaultMessage: 'Expires in {numDays} days',
    values: { numDays: expiresInDays },
  });
  let statusContent = i18n.translate('data.mgmt.searchSessions.status.expiresSoonInDaysTooltip', {
    defaultMessage: '{numDays} days',
    values: { numDays: expiresInDays },
  });

  if (expiresInDays === 0) {
    // switch to show expires in hours
    const expiresInHours = Math.floor(durationToExpire.asHours());

    toolTipContent = i18n.translate('data.mgmt.searchSessions.status.expiresSoonInHours', {
      defaultMessage: 'This session expires in {numHours} hours',
      values: { numHours: expiresInHours },
    });
    statusContent = i18n.translate('data.mgmt.searchSessions.status.expiresSoonInHoursTooltip', {
      defaultMessage: '{numHours} hours',
      values: { numHours: expiresInHours },
    });
  }

  if (durationToExpire.valueOf() > 0 && expiresInDays <= sufficientDays) {
    return { toolTipContent, statusContent };
  }
};
