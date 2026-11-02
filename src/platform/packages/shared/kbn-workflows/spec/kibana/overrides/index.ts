/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ADD_CASE_COMMENT_CONTRACT } from './kibana.add_case_comment';
import { SET_ALERTS_STATUS_CONTRACT } from './kibana.set_alerts_status';
import type { InternalConnectorContract } from '../../../types/latest';

export const KIBANA_OVERRIDES: Record<string, InternalConnectorContract> = {
  'kibana.SetAlertsStatus': SET_ALERTS_STATUS_CONTRACT,
  'kibana.addCaseComment': ADD_CASE_COMMENT_CONTRACT,
};
