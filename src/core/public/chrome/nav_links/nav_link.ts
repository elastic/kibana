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

import { pick } from '../../../utils';
import { AppCategory } from '../../';

/**
 * @public
 */
export interface ChromeNavLink {
  /**
   * A unique identifier for looking up links.
   */
  readonly id: string;

  /**
   * The title of the application.
   */
  readonly title: string;

  /**
   * The category the app lives in
   */
  readonly category?: AppCategory;

  /**
   * The base route used to open the root of an application.
   */
  readonly baseUrl: string;

  /**
   * The route used to open the {@link AppBase.defaultPath | default path } of an application.
   * If unset, `baseUrl` will be used instead.
   */
  readonly url?: string;

  /**
   * An ordinal used to sort nav links relative to one another for display.
   */
  readonly order?: number;

  /**
   * A tooltip shown when hovering over an app link.
   */
  readonly tooltip?: string;

  /**
   * A EUI iconType that will be used for the app's icon. This icon
   * takes precedence over the `icon` property.
   */
  readonly euiIconType?: string;

  /**
   * A URL to an image file used as an icon. Used as a fallback
   * if `euiIconType` is not provided.
   */
  readonly icon?: string;

  /**
   * Settled state between `url`, `baseUrl`, and `active`
   *
   * @internalRemarks
   * This should be required once legacy apps are gone.
   */
  readonly href?: string;

  /** LEGACY FIELDS */

  /**
   * A url base that legacy apps can set to match deep URLs to an application.
   *
   * @internalRemarks
   * This should be removed once legacy apps are gone.
   *
   * @deprecated
   */
  readonly subUrlBase?: string;

  /**
   * A flag that tells legacy chrome to ignore the link when
   * tracking sub-urls
   *
   * @internalRemarks
   * This should be removed once legacy apps are gone.
   *
   * @deprecated
   */
  readonly disableSubUrlTracking?: boolean;

  /**
   * Whether or not the subUrl feature should be enabled.
   *
   * @internalRemarks
   * Only read by legacy platform.
   *
   * @deprecated
   */
  readonly linkToLastSubUrl?: boolean;

  /**
   * Indicates whether or not this app is currently on the screen.
   *
   * @internalRemarks
   * Remove this when ApplicationService is implemented and managing apps.
   *
   * @deprecated
   */
  readonly active?: boolean;

  /**
   * Disables a link from being clickable.
   *
   * @internalRemarks
   * This is only used by the ML and Graph plugins currently. They use this field
   * to disable the nav link when the license is expired.
   *
   * @deprecated
   */
  readonly disabled?: boolean;

  /**
   * Hides a link from the navigation.
   *
   * @internalRemarks
   * Remove this when ApplicationService is implemented. Instead, plugins should only
   * register an Application if needed.
   */
  readonly hidden?: boolean;

  /**
   * Used to separate links to legacy applications from NP applications
   * @internal
   */
  readonly legacy: boolean;
}

/** @public */
export type ChromeNavLinkUpdateableFields = Partial<
  Pick<ChromeNavLink, 'active' | 'disabled' | 'hidden' | 'url' | 'subUrlBase' | 'href'>
>;

export class NavLinkWrapper {
  public readonly id: string;
  public readonly properties: Readonly<ChromeNavLink>;

  constructor(properties: ChromeNavLink) {
    if (!properties || !properties.id) {
      throw new Error('`id` is required.');
    }

    this.id = properties.id;
    this.properties = Object.freeze(properties);
  }

  public update(newProps: ChromeNavLinkUpdateableFields) {
    // Enforce limited properties at runtime for JS code
    newProps = pick(newProps, ['active', 'disabled', 'hidden', 'url', 'subUrlBase', 'href']);
    return new NavLinkWrapper({ ...this.properties, ...newProps });
  }
}
