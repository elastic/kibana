/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { type ESQLSourceResult, SOURCES_AUTOCOMPLETE_ROUTE, SOURCES_TYPES } from '@kbn/esql-types';
import type { ILicense } from '@kbn/licensing-types';

const INTEGRATIONS_API = '/api/fleet/epm/packages/installed';
const API_VERSION = '2023-10-31';

interface IntegrationsResponse {
  items: Array<{
    name: string;
    title?: string;
    dataStreams: Array<{
      name: string;
      title?: string;
    }>;
  }>;
}
/**
 * Fetches the list of indices, aliases, and data streams from the Elasticsearch cluster.
 * @param core The core start contract to make HTTP requests.
 * @param areRemoteIndicesAvailable A boolean indicating if remote indices should be included.
 * @returns A promise that resolves to an array of ESQLSourceResult objects.
 */
export const getIndicesList = async (
  core: Pick<CoreStart, 'http'>,
  areRemoteIndicesAvailable: boolean
): Promise<ESQLSourceResult[]> => {
  const scope = areRemoteIndicesAvailable ? 'all' : 'local';
  const response = await core.http.get(`${SOURCES_AUTOCOMPLETE_ROUTE}${scope}`).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch the sources', error);
    return [];
  });

  return response as ESQLSourceResult[];
};

/**
 * Fetches integrations with active data streams from the Fleet API
 * @param core The core start contract to make HTTP requests and access application capabilities.
 * @returns A promise that resolves to an array of ESQLSourceResult objects.
 */
const getIntegrations = async (
  core: Pick<CoreStart, 'application' | 'http'>
): Promise<ESQLSourceResult[]> => {
  const fleetCapabilities = core.application.capabilities.fleet;
  if (!fleetCapabilities?.read) {
    return [];
  }
  // Ideally we should use the Fleet plugin constants to fetch the integrations
  // import { EPM_API_ROUTES, API_VERSIONS } from '@kbn/fleet-plugin/common';
  // but it complicates things as we need to use an x-pack plugin as dependency to get 2 constants
  // and this needs to be done in various places in the codebase which use the editor
  // https://github.com/elastic/kibana/issues/186061
  const response = (await core.http
    .get(INTEGRATIONS_API, { query: { showOnlyActiveDataStreams: true }, version: API_VERSION })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch integrations', error);
    })) as IntegrationsResponse;

  return (
    response?.items
      ?.filter(({ dataStreams }) => dataStreams.length)
      .map((source) => ({
        name: source.name,
        hidden: false,
        title: source.title,
        dataStreams: source.dataStreams,
        type: SOURCES_TYPES.INTEGRATION,
      })) ?? []
  );
};

/** Fetches ESQL sources including indices, aliases, data streams, and integrations.
 * @param core The core start contract to make HTTP requests and access application capabilities.
 * @param getLicense An optional function to retrieve the current license information.
 * @returns A promise that resolves to an array of ESQLSourceResult objects.
 */
export const getESQLSources = async (
  core: Pick<CoreStart, 'application' | 'http'>,
  getLicense: (() => Promise<ILicense | undefined>) | undefined
): Promise<ESQLSourceResult[]> => {
  const ls = await getLicense?.();
  const ccrFeature = ls?.getFeature('ccr');
  const areRemoteIndicesAvailable = ccrFeature?.isAvailable ?? false;
  const [allIndices, integrations] = await Promise.all([
    getIndicesList(core, areRemoteIndicesAvailable),
    getIntegrations(core),
  ]);
  return [...allIndices, ...integrations];
};
