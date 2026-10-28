/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { IUiSettingsClient } from '@kbn/core/public';
import { SurrDocType } from '../services/context';
import type { IntervalValue } from './generate_intervals';

/**
 * Returns a request name with the time the lookup starts from, to tell requests of a type apart.
 */
export const getHitsInIntervalRequestTitle = (
  type: SurrDocType,
  start: IntervalValue,
  uiSettings: IUiSettingsClient
): string => {
  const time = moment(start).format(uiSettings.get('dateFormat'));

  return type === SurrDocType.SUCCESSORS
    ? i18n.translate('discover.context.inspectorRequestTitleOlderDocumentsBefore', {
        defaultMessage: 'Older documents (before {time})',
        values: { time },
      })
    : i18n.translate('discover.context.inspectorRequestTitleNewerDocumentsAfter', {
        defaultMessage: 'Newer documents (after {time})',
        values: { time },
      });
};
