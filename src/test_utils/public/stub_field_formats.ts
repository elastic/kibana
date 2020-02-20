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
import { CoreSetup } from 'kibana/public';
import { DataPublicPluginStart, fieldFormats } from '../../plugins/data/public';
import { deserializeFieldFormat } from '../../plugins/data/public/field_formats/utils/deserialize';

export const getFieldFormatsRegistry = (core: CoreSetup) => {
  const fieldFormatsRegistry = new fieldFormats.FieldFormatsRegistry();
  const getConfig = core.uiSettings.get.bind(core.uiSettings);

  fieldFormatsRegistry.init(getConfig, {});

  fieldFormatsRegistry.deserialize = deserializeFieldFormat.bind(
    fieldFormatsRegistry as DataPublicPluginStart['fieldFormats']
  );

  return fieldFormatsRegistry;
};
