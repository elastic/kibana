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
 * Generated at: 2026-02-26T16:36:29.567Z
 * Source: /oas_docs/output/kibana.yaml (9 APIs)
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
import { STREAMS_LIST_CONTRACT } from './kibana.streams_list.gen';
import { STREAMS_GET_CONTRACT } from './kibana.streams_get.gen';
import { STREAMS_GET_SIGNIFICANT_EVENTS_CONTRACT } from './kibana.streams_get_significant_events.gen';

// export contracts
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
  UPDATE_CASE_CONTRACT,
  CREATE_CASE_CONTRACT,
  GET_CASE_CONTRACT,
  ADD_CASE_COMMENT_CONTRACT,
  SET_ALERTS_STATUS_CONTRACT,
  SET_ALERT_TAGS_CONTRACT,
  STREAMS_LIST_CONTRACT,
  STREAMS_GET_CONTRACT,
  STREAMS_GET_SIGNIFICANT_EVENTS_CONTRACT,
];
