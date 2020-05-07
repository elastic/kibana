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

import { flatConcatAtType } from './reduce';
import { alias, mapSpec, wrap } from './modify_reduce';

function applySpecDefaults(spec, type, pluginSpec) {
  const pluginId = pluginSpec.getId();
  const {
    id = pluginId,
    main,
    title,
    order = 0,
    description = '',
    icon,
    euiIconType,
    hidden = false,
    linkToLastSubUrl = true,
    listed = !hidden,
    url = `/app/${id}`,
    category,
  } = spec;

  if (spec.injectVars) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.app.injectVars has been removed. Use server.injectUiAppVars('${id}', () => { ... })`
    );
  }

  if (spec.uses) {
    throw new Error(
      `[plugin:${pluginId}] uiExports.app.uses has been removed. Import these uiExport types with "import 'uiExports/{type}'"`
    );
  }

  return {
    pluginId,
    id,
    main,
    title,
    order,
    description,
    icon,
    euiIconType,
    hidden,
    linkToLastSubUrl,
    listed,
    url,
    category,
  };
}

export const apps = wrap(alias('uiAppSpecs'), mapSpec(applySpecDefaults), flatConcatAtType);
export const app = wrap(alias('uiAppSpecs'), mapSpec(applySpecDefaults), flatConcatAtType);
