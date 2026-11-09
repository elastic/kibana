/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Where each cloud region is, keyed by lowercase cloud provider and then by the provider's own
 * region code. Covers the regions Elastic Cloud Serverless is available in.
 * See https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/regions
 *
 * Locations are the cloud providers' own place names, so they are intentionally not translated.
 */
const REGION_LOCATIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  aws: {
    'ap-northeast-1': 'Tokyo',
    'ap-southeast-1': 'Singapore',
    'ap-southeast-2': 'Sydney',
    'ca-central-1': 'Canada',
    'eu-central-1': 'Frankfurt',
    'eu-west-1': 'Ireland',
    'eu-west-2': 'London',
    'us-east-1': 'N. Virginia',
    'us-east-2': 'Ohio',
    'us-west-2': 'Oregon',
  },
  azure: {
    australiaeast: 'New South Wales',
    brazilsouth: 'São Paulo',
    centralus: 'Iowa',
    eastus: 'Virginia',
    eastus2: 'Virginia',
    germanywestcentral: 'Frankfurt',
    northeurope: 'Ireland',
    southeastasia: 'Singapore',
    spaincentral: 'Madrid',
    swedencentral: 'Gävle',
    uaenorth: 'Dubai',
    westus2: 'Washington',
  },
  gcp: {
    'asia-northeast1': 'Tokyo',
    'asia-south1': 'Mumbai',
    'asia-southeast1': 'Singapore',
    'europe-southwest1': 'Madrid',
    'europe-west1': 'Belgium',
    'europe-west2': 'London',
    'europe-west3': 'Frankfurt',
    'europe-west4': 'Netherlands',
    'us-central1': 'Iowa',
    'us-east1': 'South Carolina',
    'us-east4': 'Virginia',
    'us-west1': 'Oregon',
  },
};

/**
 * Lowercases the region and drops a leading `<provider>-`, so `aws-eu-west-1` and `eu-west-1` both
 * give the provider's own code, `eu-west-1`.
 */
const getRegionCode = (csp: string, region: string): string => {
  const regionCode = region.toLowerCase();
  const providerPrefix = `${csp.toLowerCase()}-`;

  return regionCode.startsWith(providerPrefix)
    ? regionCode.slice(providerPrefix.length)
    : regionCode;
};

/**
 * Returns a friendly label for a project's cloud region, e.g. `Ireland (eu-west-1)`.
 * Falls back to the bare region code when the region isn't one we know the location of.
 */
export const getRegionLabel = (csp: string, region: string): string => {
  const regionCode = getRegionCode(csp, region);
  const location = REGION_LOCATIONS[csp.toLowerCase()]?.[regionCode];

  if (typeof location !== 'string') {
    return regionCode;
  }

  return `${location} (${regionCode})`;
};
