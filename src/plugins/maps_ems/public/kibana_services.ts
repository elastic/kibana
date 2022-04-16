/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { ILicense } from '@kbn/licensing-plugin/common/types';
import type { MapConfig } from '../config';
import { LICENSE_CHECK_ID } from '../common';

let kibanaVersion: string;
export const setKibanaVersion = (version: string) => (kibanaVersion = version);
export const getKibanaVersion = (): string => kibanaVersion;

let mapsEmsConfig: MapConfig;
export const setMapConfig = (mapsEms: MapConfig) => {
  mapsEmsConfig = mapsEms;
};
export const getMapConfig = () => mapsEmsConfig;

let isEnterprisePlus: boolean = false;
function updateLicenseState(license: ILicense) {
  const enterprise = license.check(LICENSE_CHECK_ID, 'enterprise');
  isEnterprisePlus = enterprise.state === 'valid';
}
export function getIsEnterprisePlus() {
  return isEnterprisePlus;
}

export async function setLicensingPluginStart(licensingPlugin: LicensingPluginStart) {
  const license = await licensingPlugin.refresh();
  updateLicenseState(license);
  licensingPlugin.license$.subscribe(updateLicenseState);
}
