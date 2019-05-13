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

/**
 * @public
 */
export interface ChromeNavLink {
  /**
   * A unique identifier for looking up links.
   */
  readonly id: string;

  /**
   * Indicates whether or not this app is currently on the screen.
   *
   * NOTE: remove this when ApplicationService is implemented and managing apps.
   */
  readonly active?: boolean;

  /**
   * Disables a link from being clickable.
   *
   * NOTE: this is only used by the ML and Graph plugins currently. They use this field
   * to disable the nav link when the license is expired.
   */
  readonly disabled?: boolean;

  /**
   * Hides a link from the navigation.
   *
   * NOTE: remove this when ApplicationService is implemented. Instead, plugins should only
   * register an Application if needed.
   */
  readonly hidden?: boolean;

  /**
   * An ordinal used to sort nav links relative to one another for display.
   */
  readonly order: number;

  /**
   * The title of the application.
   */
  readonly title: string;

  /**
   * A tooltip shown when hovering over an app link.
   */
  readonly tooltip?: string;

  /**
   * The base route used to open the root of an application.
   */
  readonly baseUrl: string;

  /**
   * A EUI iconType that will be used for the app's icon. This icon
   * takes precendence over the `icon` property.
   */
  readonly euiIconType?: string;

  /**
   * A URL to an image file used as an icon. Used as a fallback
   * if `euiIconType` is not provided.
   */
  readonly icon?: string;

  /** LEGACY FIELDS */

  /**
   * A url base that legacy apps can set to match deep URLs to an applcation.
   *
   * NOTE: this should be removed once legacy apps are gone.
   */
  readonly subUrlBase?: string;

  /**
   * Whether or not the subUrl feature should be enabled.
   *
   * NOTE: only read by legacy platform.
   */
  readonly linkToLastSubUrl?: boolean;

  /**
   * A url that legacy apps can set to deep link into their applications.
   *
   * NOTE: Currently used by the "lastSubUrl" feature legacy/ui/chrome. This should
   * be removed once the ApplicationService is implemented and mounting apps. At that
   * time, each app can handle opening to the previous location when they are mounted.
   */
  readonly url?: string;
}

export type NavLinkUpdateableFields = Partial<
  Pick<ChromeNavLink, 'active' | 'disabled' | 'hidden' | 'url' | 'subUrlBase'>
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

  public update(newProps: NavLinkUpdateableFields) {
    // Enforce limited properties at runtime for JS code
    newProps = pick(newProps, ['active', 'disabled', 'hidden', 'url', 'subUrlBase']);
    return new NavLinkWrapper({ ...this.properties, ...newProps });
  }
}
