/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';

export const CA_CERT_PATH = resolve(__dirname, '../certs/ca.crt');
export const ES_KEY_PATH = resolve(__dirname, '../certs/elasticsearch.key');
export const ES_CERT_PATH = resolve(__dirname, '../certs/elasticsearch.crt');
export const ES_P12_PATH = resolve(__dirname, '../certs/elasticsearch.p12');
export const ES_P12_PASSWORD = 'storepass';
export const ES_EMPTYPASSWORD_P12_PATH = resolve(
  __dirname,
  '../certs/elasticsearch_emptypassword.p12'
);
export const ES_NOPASSWORD_P12_PATH = resolve(__dirname, '../certs/elasticsearch_nopassword.p12');
export const KBN_KEY_PATH = resolve(__dirname, '../certs/kibana.key');
export const KBN_CERT_PATH = resolve(__dirname, '../certs/kibana.crt');
export const KBN_P12_PATH = resolve(__dirname, '../certs/kibana.p12');
export const KBN_P12_PASSWORD = 'storepass';
