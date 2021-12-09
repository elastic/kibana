/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EMSClient } from '@elastic/ems-client';
import { EMSSettings } from '../common/ems_settings';
import { EMS_APP_NAME } from '../common';

export async function createEMSClient(
  emsSettings: EMSSettings,
  kbnVersion: string
): Promise<EMSClient> {
  return new EMSClient({
    language: i18n.getLocale(),
    appVersion: kbnVersion,
    appName: EMS_APP_NAME,
    tileApiUrl: emsSettings!.getEMSTileApiUrl(),
    fileApiUrl: emsSettings!.getEMSFileApiUrl(),
    landingPageUrl: emsSettings!.getEMSLandingPageUrl(),
    fetchFunction(url: string) {
      return fetch(url);
    },
    proxyPath: '',
  });
}
