/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
