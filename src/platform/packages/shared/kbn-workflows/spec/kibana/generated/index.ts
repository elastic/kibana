/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * This file contains Kibana connector definitions generated from Kibana OpenAPI specification.
 * Generated at: 2026-01-20T11:22:36.325Z
 * Source: /oas_docs/output/kibana.yaml (6 APIs)
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */
/* eslint-disable import/order */

import type { InternalConnectorContract } from '../../../types/latest';

// import contracts from individual files
import { UPDATE_CASE_CONTRACT } from './kibana.update_case.gen';
import { CREATE_CASE_CONTRACT } from './kibana.create_case.gen';
import { GET_CASE_CONTRACT } from './kibana.get_case.gen';
import { ADD_CASE_COMMENT_CONTRACT } from './kibana.add_case_comment.gen';
import { SET_ALERTS_STATUS_CONTRACT } from './kibana.set_alerts_status.gen';
import { SET_ALERT_TAGS_CONTRACT } from './kibana.set_alert_tags.gen';

// export contracts
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
  UPDATE_CASE_CONTRACT,
  CREATE_CASE_CONTRACT,
  GET_CASE_CONTRACT,
  ADD_CASE_COMMENT_CONTRACT,
  SET_ALERTS_STATUS_CONTRACT,
  SET_ALERT_TAGS_CONTRACT,
];
