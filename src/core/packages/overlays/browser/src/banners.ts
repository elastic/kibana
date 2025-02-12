/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MountPoint } from '@kbn/core-mount-utils-browser';

/** @public */
export interface OverlayBannersStart {
  /**
   * Add a new banner
   *
   * @param mount {@link MountPoint}
   * @param priority optional priority order to display this banner. Higher priority values are shown first.
   * @returns a unique identifier for the given banner to be used with {@link OverlayBannersStart.remove} and
   *          {@link OverlayBannersStart.replace}
   */
  add(mount: MountPoint, priority?: number): string;

  /**
   * Remove a banner
   *
   * @param id the unique identifier for the banner returned by {@link OverlayBannersStart.add}
   * @returns if the banner was found or not
   */
  remove(id: string): boolean;

  /**
   * Replace a banner in place
   *
   * @param id the unique identifier for the banner returned by {@link OverlayBannersStart.add}
   * @param mount {@link MountPoint}
   * @param priority optional priority order to display this banner. Higher priority values are shown first.
   * @returns a new identifier for the given banner to be used with {@link OverlayBannersStart.remove} and
   *          {@link OverlayBannersStart.replace}
   */
  replace(id: string | undefined, mount: MountPoint, priority?: number): string;

  getComponent(): JSX.Element;
}
