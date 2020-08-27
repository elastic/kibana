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

import { ComponentType } from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';

/**
 * @public
 * Properties of the current object to share. Registered share
 * menu providers will provide suitable items which have to
 * be rendered in an appropriate place by the caller.
 *
 * It is possible to use the static function `toggleShareContextMenu`
 * to render the menu as a popover.
 * */
export interface ShareContext {
  objectType: string;
  objectId?: string;
  /**
   * Current url for sharing. This can be set in cases where `window.location.href`
   * does not contain a shareable URL (e.g. if using session storage to store the current
   * app state is enabled). In these cases the property should contain the URL in a
   * format which makes it possible to use it without having access to any other state
   * like the current session.
   *
   * If not set it will default to `window.location.href`
   */
  shareableUrl: string;
  sharingData: { [key: string]: unknown };
  isDirty: boolean;
  onClose: () => void;
}

/**
 * @public
 * Eui context menu entry shown directly in the context menu. `sortOrder` is
 * used to order the individual items in a flat list returned by all registered
 * menu providers.
 * */
export interface ShareContextMenuPanelItem extends Omit<EuiContextMenuPanelItemDescriptor, 'name'> {
  name: string; // EUI will accept a `ReactNode` for the `name` prop, but `ShareContentMenu` assumes a `string`.
  sortOrder?: number;
}

/**
 * @public
 * Definition of a menu item rendered in the share menu. `shareMenuItem` is shown
 * directly in the context menu. If the item is clicked, the `panel` is shown.
 * */
export interface ShareMenuItem {
  shareMenuItem: ShareContextMenuPanelItem;
  panel: EuiContextMenuPanelDescriptor;
}

/**
 * @public
 * A source for additional menu items shown in the share context menu. Any provider
 * registered via `share.register()` will be called if a consumer displays the context
 * menu. Returned `ShareMenuItem`s will be shown in the context menu together with the
 * default built-in share options. Each share provider needs a globally unique id.
 * */
export interface ShareMenuProvider {
  readonly id: string;

  getShareMenuItems: (context: ShareContext) => ShareMenuItem[];
}

interface UrlParamExtensionProps {
  setParamValue: (values: {}) => void;
}

export interface UrlParamExtension {
  paramName: string;
  component: ComponentType<UrlParamExtensionProps>;
}

/** @public */
export interface ShowShareMenuOptions extends Omit<ShareContext, 'onClose'> {
  anchorElement: HTMLElement;
  allowEmbed: boolean;
  allowShortUrl: boolean;
  embedUrlParamExtensions?: UrlParamExtension[];
}
