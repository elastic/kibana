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

import Joi from 'joi';

const STUB_CONFIG_SCHEMA = Joi.object()
  .keys({
    enabled: Joi.valid(false).default(false),
  })
  .default();

const DEFAULT_CONFIG_SCHEMA = Joi.object()
  .keys({
    enabled: Joi.boolean().default(true),
  })
  .default();

/**
 *  Get the config schema for a plugin spec
 *  @param  {PluginSpec} spec
 *  @return {Promise<Joi>}
 */
export async function getSchema(spec) {
  const provider = spec.getConfigSchemaProvider();
  return (provider && (await provider(Joi))) || DEFAULT_CONFIG_SCHEMA;
}

export function getStubSchema() {
  return STUB_CONFIG_SCHEMA;
}
