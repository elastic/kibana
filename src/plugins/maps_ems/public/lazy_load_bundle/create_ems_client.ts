/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import coerce from 'semver/functions/coerce';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BuildFlavor } from '@kbn/config/src/types';
import { i18n } from '@kbn/i18n';
import { EMSClient } from '@elastic/ems-client';
import { EMS_APP_NAME, EMSSettings, DEFAULT_EMS_REST_VERSION } from '../../common';

export function createEMSClient(
  emsSettings: EMSSettings,
  kbnVersion: string,
  buildFlavor: BuildFlavor = 'traditional'
): EMSClient {
  let landingPageUrl = emsSettings!.getEMSLandingPageUrl();
  const kbnSemVer = coerce(kbnVersion);
  const isServerless = buildFlavor === 'serverless';
  const headers = new Headers();

  if (!isServerless && kbnSemVer) {
    landingPageUrl = `${landingPageUrl}/v${kbnSemVer.major}.${kbnSemVer.minor}`;
  }

  if (isServerless) {
    headers.append(ELASTIC_HTTP_VERSION_HEADER, DEFAULT_EMS_REST_VERSION);
  }

  const version = isServerless ? DEFAULT_EMS_REST_VERSION : kbnVersion;

  return new EMSClient({
    language: i18n.getLocale(),
    appVersion: version,
    emsVersion: version,
    appName: EMS_APP_NAME,
    tileApiUrl: emsSettings!.getEMSTileApiUrl(),
    fileApiUrl: emsSettings!.getEMSFileApiUrl(),
    landingPageUrl,
    fetchFunction(url: string) {
      return fetch(url, { headers });
    },
    proxyPath: '',
  });
}
