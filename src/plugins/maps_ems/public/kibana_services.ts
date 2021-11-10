/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MapsEmsConfig } from '../config';
import { LicensingPluginStart } from '../../../../x-pack/plugins/licensing/public';
import { ILicense } from '../../../../x-pack/plugins/licensing/common/types';

let kibanaVersion: string;
export const setKibanaVersion = (version: string) => (kibanaVersion = version);
export const getKibanaVersion = (): string => kibanaVersion;

let mapsEmsConfig: MapsEmsConfig;
export const setMapsEmsConfig = (config: MapsEmsConfig) => (mapsEmsConfig = config);
export const getMapsEmsConfig = () => mapsEmsConfig;

let isEnterprisePlus: boolean = false;
function updateLicenseState(license: ILicense) {
  const enterprise = license.check('maps_ems', 'enterprise');
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
