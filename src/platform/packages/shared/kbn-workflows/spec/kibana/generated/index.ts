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
 * Generated at: 2025-12-14T14:55:15.443Z
 * Source: /oas_docs/output/kibana.yaml (6 APIs)
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */
/* eslint-disable import/order */

import type { InternalConnectorContract } from '../../../types/latest';

// import contracts from individual files
import { UPDATE_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.update_case_default_space.gen';
import { CREATE_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.create_case_default_space.gen';
import { GET_CASE_DEFAULT_SPACE_CONTRACT } from './kibana.get_case_default_space.gen';
import { ADD_CASE_COMMENT_DEFAULT_SPACE_CONTRACT } from './kibana.add_case_comment_default_space.gen';
import { SET_ALERTS_STATUS_CONTRACT } from './kibana.set_alerts_status.gen';
import { SET_ALERT_TAGS_CONTRACT } from './kibana.set_alert_tags.gen';

// export contracts
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
  UPDATE_CASE_DEFAULT_SPACE_CONTRACT,
  CREATE_CASE_DEFAULT_SPACE_CONTRACT,
  GET_CASE_DEFAULT_SPACE_CONTRACT,
  ADD_CASE_COMMENT_DEFAULT_SPACE_CONTRACT,
  SET_ALERTS_STATUS_CONTRACT,
  SET_ALERT_TAGS_CONTRACT,
];
