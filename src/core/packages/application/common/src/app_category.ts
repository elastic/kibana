/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A category definition for nav links to know where to sort them in the left hand nav
 * @public
 */
export interface AppCategory {
  /**
   * Unique identifier for the categories
   */
  id: string;

  /**
   * Label used for category name.
   * Also used as aria-label if one isn't set.
   */
  label: string;

  /**
   * If the visual label isn't appropriate for screen readers,
   * can override it here
   */
  ariaLabel?: string;

  /**
   * The order that categories will be sorted in
   * Prefer large steps between categories to allow for further editing
   * (Default categories are in steps of 1000)
   */
  order?: number;

  /**
   * Define an icon to be used for the category
   * If the category is only 1 item, and no icon is defined, will default to the product icon
   * Defaults to initials if no icon is defined
   */
  euiIconType?: string;
}
