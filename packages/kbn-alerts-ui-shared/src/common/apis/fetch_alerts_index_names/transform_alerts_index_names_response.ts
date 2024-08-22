/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AsApiContract, RewriteRequestCase } from '@kbn/actions-types';

interface AlertsIndexNamesResponse {
  indexName: string[];
  hasReadIndexPrivilege: boolean;
}

export const transformAlertsIndexNamesResponse: RewriteRequestCase<AlertsIndexNamesResponse> = ({
  index_name: indexName,
  has_read_index_privilege: hasReadIndexPrivilege,
}: AsApiContract<AlertsIndexNamesResponse>) => ({
  indexName,
  hasReadIndexPrivilege,
});
