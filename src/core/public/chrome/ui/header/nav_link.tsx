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

import React from 'react';
import { EuiImage } from '@elastic/eui';
import { ChromeNavLink } from '../../../';
import { HttpStart } from '../../../http';

function LinkIcon({ url }: { url: string }) {
  return <EuiImage size="s" alt="" aria-hidden={true} url={url} />;
}

export type NavLink = ReturnType<typeof euiNavLink>;

export function euiNavLink(
  navLink: ChromeNavLink,
  legacyMode: boolean,
  currentAppId: string | undefined,
  basePath: HttpStart['basePath']
) {
  const {
    legacy,
    url,
    active,
    baseUrl,
    id,
    title,
    disabled,
    euiIconType,
    icon,
    category,
    order,
    tooltip,
  } = navLink;
  let href = navLink.url ?? navLink.baseUrl;

  if (legacy) {
    href = url && !active ? url : baseUrl;
  }

  return {
    category,
    key: id,
    label: tooltip ?? title,
    href, // SPA navigation is handled by core global link handler
    // Legacy apps use `active` property, NP apps should match the current app
    isActive: active || currentAppId === id,
    isDisabled: disabled,
    iconType: euiIconType,
    icon: !euiIconType && icon ? <LinkIcon url={basePath.prepend(`/${icon}`)} /> : undefined,
    order,
    'data-test-subj': 'navDrawerAppsMenuLink',
  };
}
