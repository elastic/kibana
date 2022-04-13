/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IServiceSettings } from './service_settings_types';
import { ServiceSettings } from './service_settings';
import { getMapsEms } from '../../../services';
import type { MapsEmsPluginPublicStart, MapConfig } from '../../../../../../maps_ems/public';

export async function getServiceSettings(): Promise<IServiceSettings> {
  const mapsEms: MapsEmsPluginPublicStart = getMapsEms();
  const mapsEmsConfig: MapConfig = mapsEms.config;
  const emsClient = await mapsEms.createEMSClient();
  // any kibana user, regardless of distribution, should get all zoom levels
  // use `sspl` license to indicate this
  emsClient.addQueryParams({ license: 'sspl' });
  return new ServiceSettings(mapsEmsConfig, mapsEmsConfig.tilemap, emsClient);
}
