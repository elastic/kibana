/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppCategory } from '../..';

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
   * The route used to open the default path and the deep links of an application.
   */
  readonly url: string;

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
   */
  readonly href: string;

  /**
   * Disables a link from being clickable.
   *
   * @internalRemarks
   * This is only used by the ML and Graph plugins currently. They use this field
   * to disable the nav link when the license is expired.
   */
  readonly disabled?: boolean;

  /**
   * Hides a link from the navigation.
   */
  readonly hidden?: boolean;
}

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
}
