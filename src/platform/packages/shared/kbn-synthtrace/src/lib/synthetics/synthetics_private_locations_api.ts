/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaClient } from '../shared/base_kibana_client';

const PRIVATE_LOCATIONS_PATH = '/api/synthetics/private_locations';
const DEFAULT_SPACE_ID = 'default';

export interface SyntheticsPrivateLocation {
  id: string;
  label: string;
}

interface PrivateLocationResponseItem extends SyntheticsPrivateLocation {
  /** True when the agent policy of the location no longer exists. */
  isInvalid?: boolean;
}

/**
 * Chooses the private location of a scenario when none was given: the only valid one. It
 * never guesses between several, because a wrong choice puts monitors on the wrong location.
 */
export const pickPrivateLocation = (
  locations: PrivateLocationResponseItem[]
): SyntheticsPrivateLocation => {
  const valid = locations.filter(({ isInvalid }) => !isInvalid);

  if (valid.length === 1) {
    const [{ id, label }] = valid;
    return { id, label };
  }

  if (valid.length === 0) {
    throw new Error(
      'No private location found. Create one in Kibana under Synthetics > Settings > ' +
        'Private locations (it only needs a Fleet agent policy), or pass ' +
        '--scenarioOpts.privateLocationId and --scenarioOpts.privateLocationLabel.'
    );
  }

  const list = valid.map(({ id, label }) => `  ${id} "${label}"`).join('\n');
  throw new Error(
    `Found ${valid.length} private locations, so the scenario cannot choose one. ` +
      `Pass --scenarioOpts.privateLocationId and --scenarioOpts.privateLocationLabel:\n${list}`
  );
};

/** Looks up the only private location of a Kibana space. See `pickPrivateLocation`. */
export const discoverPrivateLocation = async ({
  kibana,
  spaceId = DEFAULT_SPACE_ID,
}: {
  kibana: Pick<KibanaClient, 'fetch'>;
  spaceId?: string;
}): Promise<SyntheticsPrivateLocation> => {
  const path =
    spaceId === DEFAULT_SPACE_ID
      ? PRIVATE_LOCATIONS_PATH
      : `/s/${encodeURIComponent(spaceId)}${PRIVATE_LOCATIONS_PATH}`;
  const response = await kibana.fetch<PrivateLocationResponseItem[]>(path, { method: 'GET' });

  if (!Array.isArray(response)) {
    throw new Error(`Unexpected response from GET ${path}: expected a list of private locations`);
  }

  return pickPrivateLocation(response);
};
