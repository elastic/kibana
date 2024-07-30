/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';

export const DEFAULTS = {
  LOCATION_NAME: `Default location ${uuidv4()}`,
  AGENT_POLICY_NAME: `Synthetics agent policy ${uuidv4()}`,
  ELASTICSEARCH_HOST: 'http://host.docker.internal:9200',
  ELASTICSEARCH_USERNAME: 'elastic',
  ELASTICSEARCH_PASSWORD: 'changeme',
  ELASTICSEARCH_API_KEY: '',
  KIBANA_URL: 'http://localhost:5601',
  KIBANA_USERNAME: 'elastic',
  KIBANA_PASSWORD: 'changeme',
  INCLUDE_FLEET_SERVER: true,
  FLEET_SERVER_URL: 'http://host.docker.internal:8220',
};
