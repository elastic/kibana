/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UrlForwardingSetup } from '@kbn/url-forwarding-plugin/public';
import { DASHBOARD_APP_ID } from '../../../common/constants';

const LEGACY_DASHBOARD_APP_ID = 'dashboard';

export function setupUrlForwarding(urlForwarding: UrlForwardingSetup) {
  urlForwarding.forwardApp(DASHBOARD_APP_ID, DASHBOARD_APP_ID, (path) => {
    const [, tail] = /(\?.*)/.exec(path) || [];
    // carry over query if it exists
    return `#/list${tail || ''}`;
  });
  urlForwarding.forwardApp(LEGACY_DASHBOARD_APP_ID, DASHBOARD_APP_ID, rewriteLegacyPath);
}

export function rewriteLegacyPath(path: string) {
  const [, id, tail] = /dashboard\/?(.*?)($|\?.*)/.exec(path) || [];
  if (!id && !tail) {
    // unrecognized sub url
    return '#/list';
  }
  if (!id && tail) {
    // unsaved dashboard, but probably state in URL
    return `#/create${tail || ''}`;
  }
  // persisted dashboard, probably with url state
  return `#/view/${id}${tail || ''}`;
}
