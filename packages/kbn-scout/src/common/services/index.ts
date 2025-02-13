/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { getEsClient, getKbnClient } from './clients';
export { createScoutConfig } from './config';
export { getEsArchiver } from './es_archiver';
export { createKbnUrl } from './kibana_url';
export { createSamlSessionManager } from './saml_auth';
export { getLogger } from './logger';

export type { KibanaUrl } from './kibana_url';
export type { SamlSessionManager } from '@kbn/test';
export type { ScoutLogger } from './logger';
export type { KbnClient } from '@kbn/test';
export type { Client as EsClient } from '@elastic/elasticsearch';
