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

import {
  LegacyUiExports,
  LegacyNavLink,
  LegacyPluginSpec,
  LegacyNavLinkSpec,
  LegacyAppSpec,
} from '../types';

function legacyAppToNavLink(spec: LegacyAppSpec): LegacyNavLink {
  if (!spec.id) {
    throw new Error('Every app must specify an id');
  }
  return {
    id: spec.id,
    title: spec.title ?? spec.id,
    order: typeof spec.order === 'number' ? spec.order : 0,
    icon: spec.icon,
    euiIconType: spec.euiIconType,
    url: spec.url || `/app/${spec.id}`,
    linkToLastSubUrl: spec.linkToLastSubUrl ?? true,
  };
}

function legacyLinkToNavLink(spec: LegacyNavLinkSpec): LegacyNavLink {
  return {
    id: spec.id,
    title: spec.title,
    order: typeof spec.order === 'number' ? spec.order : 0,
    url: spec.url,
    subUrlBase: spec.subUrlBase || spec.url,
    disableSubUrlTracking: spec.disableSubUrlTracking,
    icon: spec.icon,
    euiIconType: spec.euiIconType,
    linkToLastSubUrl: spec.linkToLastSubUrl ?? true,
    hidden: spec.hidden ?? false,
    disabled: spec.disabled ?? false,
    tooltip: spec.tooltip ?? '',
  };
}

function isHidden(app: LegacyAppSpec) {
  return app.listed === false || app.hidden === true;
}

export function getNavLinks(uiExports: LegacyUiExports, pluginSpecs: LegacyPluginSpec[]) {
  const navLinkSpecs = uiExports.navLinkSpecs || [];
  const appSpecs = (uiExports.uiAppSpecs || []).filter(
    app => app !== undefined && !isHidden(app)
  ) as LegacyAppSpec[];

  const pluginIds = (pluginSpecs || []).map(spec => spec.getId());
  appSpecs.forEach(spec => {
    if (spec.pluginId && !pluginIds.includes(spec.pluginId)) {
      throw new Error(`Unknown plugin id "${spec.pluginId}"`);
    }
  });

  return [...navLinkSpecs.map(legacyLinkToNavLink), ...appSpecs.map(legacyAppToNavLink)].sort(
    (a, b) => a.order - b.order
  );
}
