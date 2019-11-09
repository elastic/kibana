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
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui/src/components/context_menu/context_menu';

/**
 * @public
 * Properties of the current object to share. Registered share
 * actions provider will provide suitable actions which have to
 * be rendered in an appropriate place by the caller.
 *
 * It is possible to use the static function `showShareContextMenu`
 * to render the menu as a popover.
 * */
export interface ShareActionProps {
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
  shareableUrl?: string;
  getUnhashableStates: () => object[];
  sharingData: any;
  isDirty: boolean;
  onClose: () => void;
}

/**
 * @public
 * Eui context menu entry shown directly in the context menu. `sortOrder` is
 * used to order the individual items in a flat list returned by all registered
 * action providers.
 * */
export interface ShareContextMenuPanelItem extends EuiContextMenuPanelItemDescriptor {
  sortOrder: number;
}

/**
 * @public
 * Definition of an action item rendered in the share menu. `shareMenuItem` is shown
 * directly in the context menu. If the item is clicked, the `panel` is shown.
 * */
export interface ShareAction {
  shareMenuItem: ShareContextMenuPanelItem;
  panel: EuiContextMenuPanelDescriptor;
}

/** @public */
export interface ShareActionsProvider {
  readonly id: string;

  getShareActions: (actionProps: ShareActionProps) => ShareAction[];
}

/** @public */
export interface ShowProps extends Omit<ShareActionProps, 'onClose'>  {
  anchorElement: HTMLElement;
  allowEmbed: boolean;
  allowShortUrl: boolean;
  shareActions: ShareAction[];
}

export class ShareActionsRegistry {
  private readonly shareActionsProviders = new Map<string, ShareActionsProvider>();

  public setup() {
    return {
      register: (shareActionsProvider: ShareActionsProvider) => {
        if (this.shareActionsProviders.has(shareActionsProvider.id)) {
          throw new Error(
            `Share action provider with id [${shareActionsProvider.id}] has already been registered. Use a unique id.`
          );
        }

        this.shareActionsProviders.set(shareActionsProvider.id, shareActionsProvider);
      },
    };
  }

  public start() {
    return {
      getActions: (props: ShareActionProps) =>
        Array.from(this.shareActionsProviders.values())
          .flatMap(shareActionProvider => shareActionProvider.getShareActions(props))
    showShareContextMenu: (showProps: ShowProps) => {

      }
    };
  }
}

export type ShareActionsRegistrySetup = ReturnType<ShareActionsRegistry['setup']>;
export type ShareActionsRegistryStart = ReturnType<ShareActionsRegistry['start']>;
