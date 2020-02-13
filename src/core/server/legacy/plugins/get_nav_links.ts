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

import { LegacyUiExports, LegacyNavLink, LegacyPluginSpec } from '../types';

const REMOVE_FROM_ARRAY: LegacyNavLink[] = [];

function getUiAppsNavLinks({ uiAppSpecs = [] }: LegacyUiExports, pluginSpecs: LegacyPluginSpec[]) {
  return uiAppSpecs.flatMap(spec => {
    if (!spec) {
      return REMOVE_FROM_ARRAY;
    }

    const id = spec.id;

    if (!id) {
      throw new Error('Every app must specify an id');
    }

    if (spec.pluginId && !pluginSpecs.some(plugin => plugin.getId() === spec.pluginId)) {
      throw new Error(`Unknown plugin id "${spec.pluginId}"`);
    }

    const listed = typeof spec.listed === 'boolean' ? spec.listed : true;

    if (spec.hidden || !listed) {
      return REMOVE_FROM_ARRAY;
    }

    return {
      id,
      category: spec.category,
      title: spec.title,
      order: typeof spec.order === 'number' ? spec.order : 0,
      icon: spec.icon,
      euiIconType: spec.euiIconType,
      url: spec.url || `/app/${id}`,
      linkToLastSubUrl: spec.linkToLastSubUrl,
    };
  });
}

export function getNavLinks(uiExports: LegacyUiExports, pluginSpecs: LegacyPluginSpec[]) {
  return (uiExports.navLinkSpecs || [])
    .map<LegacyNavLink>(spec => ({
      id: spec.id,
      category: spec.category,
      title: spec.title,
      order: typeof spec.order === 'number' ? spec.order : 0,
      url: spec.url,
      subUrlBase: spec.subUrlBase || spec.url,
      disableSubUrlTracking: spec.disableSubUrlTracking,
      icon: spec.icon,
      euiIconType: spec.euiIconType,
      linkToLastSub: 'linkToLastSubUrl' in spec ? spec.linkToLastSubUrl : false,
      hidden: 'hidden' in spec ? spec.hidden : false,
      disabled: 'disabled' in spec ? spec.disabled : false,
      tooltip: spec.tooltip || '',
    }))
    .concat(getUiAppsNavLinks(uiExports, pluginSpecs))
    .sort((a, b) => a.order - b.order);
}
