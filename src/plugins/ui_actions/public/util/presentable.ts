/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiComponent } from '@kbn/kibana-utils-plugin/public';

/**
 * Represents something that can be displayed to user in UI.
 */
export interface Presentable<Context = unknown> {
  /**
   * ID that uniquely identifies this object.
   */
  readonly id: string;

  /**
   * Determines the display order in relation to other items. Higher numbers are
   * displayed first.
   */
  readonly order: number;

  /**
   * `UiComponent` to render when displaying this entity as a context menu item.
   * If not provided, `getDisplayName` will be used instead.
   */
  readonly MenuItem?: UiComponent<{ context: Context }>;

  /**
   * Optional EUI icon type that can be displayed along with the title.
   */
  getIconType(context: Context): string | undefined;

  /**
   * Returns a title to be displayed to the user.
   */
  getDisplayName(context: Context): string;

  /**
   * Returns tooltip text which should be displayed when user hovers this object.
   * Should return empty string if tooltip should not be displayed.
   */
  getDisplayNameTooltip?(context: Context): string;

  /**
   * This method should return a link if this item can be clicked on. The link
   * is used to navigate user if user middle-clicks it or Ctrl + clicks or
   * right-clicks and selects "Open in new tab".
   */
  getHref?(context: Context): Promise<string | undefined>;

  /**
   * Returns a promise that resolves to true if this item is compatible given
   * the context and should be displayed to user, otherwise resolves to false.
   */
  isCompatible(context: Context): Promise<boolean>;

  /**
   * Grouping where this item should appear as a submenu. Each entry is a new
   * sub-menu level. For example, used to show drilldowns and sharing options
   * in panel context menu in a sub-menu.
   */
  readonly grouping?: PresentableGrouping<Context>;
}

export interface PresentableGroup<Context = unknown>
  extends Partial<
    Pick<Presentable<Context>, 'getDisplayName' | 'getDisplayNameTooltip' | 'getIconType' | 'order'>
  > {
  id: string;
}

export type PresentableGrouping<Context = unknown> = Array<PresentableGroup<Context>>;
