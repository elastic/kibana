/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { ConnectorSpec } from '../../connector_spec';
import type { ResponseCheckMode, ResponseHandlingFinding } from './check_response_handling';
import { checkResponseHandling } from './check_response_handling';
import type { VendorApiFixtures } from './fixtures';
import { vendorApiFixturesSchema } from './fixtures';
import { FIXTURES, SILENT_LOG, loadVendorSpecs, readOptional } from './load_vendor_specs';

const offline = async (url: string): Promise<string> => {
  throw new Error(`${url} has no snapshot, and response checks run offline`);
};

/**
 * Checks how a connector's handlers handle boundary, paginated and error responses, against the
 * committed snapshots, overlay, pagination descriptors and fixtures in its `vendor_api` folder.
 */
export const checkRecordedConnector = async ({
  connector,
  directory,
  modes,
}: {
  readonly connector: ConnectorSpec;
  /** The connector's `vendor_api` folder. */
  readonly directory: string;
  readonly modes?: readonly ResponseCheckMode[];
}): Promise<ResponseHandlingFinding[]> => {
  const { specs, pagination } = await loadVendorSpecs({
    directory,
    fetchText: offline,
    log: SILENT_LOG,
  });
  const fixturesText = await readOptional(path.join(directory, FIXTURES));
  const fixtures: VendorApiFixtures = fixturesText
    ? vendorApiFixturesSchema.parse(JSON.parse(fixturesText))
    : {};
  return checkResponseHandling({ connector, specs, fixtures, pagination, modes });
};
