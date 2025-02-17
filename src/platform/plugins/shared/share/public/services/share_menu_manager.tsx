/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CoreStart, ThemeServiceStart, UserProfileService } from '@kbn/core/public';
import { ShowShareMenuOptions } from '../types';
import { ShareMenuRegistryStart } from './share_menu_registry';
import type { ShareMenuItemV2 } from '../types';
import { ShareMenu } from '../components/share_tabs';
import { ShareOptionsManager } from './share_options_manager';

interface ShareMenuManagerStartDeps {
  core: CoreStart;
  shareRegistry: ShareMenuRegistryStart;
  disableEmbed: boolean;
  shareOptionsManager: ShareOptionsManager;
}

export class ShareMenuManager {
  private isOpen = false;
  private shareOptionsManager?: ShareOptionsManager;
  private container = document.createElement('div');

  start({ core, shareOptionsManager, shareRegistry, disableEmbed }: ShareMenuManagerStartDeps) {
    this.shareOptionsManager = shareOptionsManager;

    return {
      showShareDialog: this.showShareDialog.bind(this),

      /**
       * Collects share menu items from registered providers and mounts the share context menu under
       * the given `anchorElement`. If the context menu is already opened, a call to this method closes it.
       * @param options
       */
      toggleShareContextMenu: (options: ShowShareMenuOptions) => {
        const onClose = () => {
          this.onClose();
          options.onClose?.();
        };

        const menuItems = this.shareOptionsManager!.resolveShareItemsForShareContext({
          ...options,
          onClose,
        });

        this.toggleShareContextMenu({
          ...options,
          allowEmbed: disableEmbed ? false : options.allowEmbed,
          onClose,
          menuItems,
          publicAPIEnabled: !disableEmbed,
          ...core,
        });
      },
    };
  }

  private onClose = () => {
    ReactDOM.unmountComponentAtNode(this.container);
    this.isOpen = false;
  };

  private showShareDialog(app: string) {
    const shareOptions = this.shareOptionsManager?.getShareConfigOptionsForApp(app);

    if (!shareOptions) {
      return;
    }

    console.log('share options available for app', shareOptions);
  }

  private toggleShareContextMenu({
    anchorElement,
    allowEmbed,
    allowShortUrl,
    objectId,
    objectType,
    objectTypeMeta,
    sharingData,
    menuItems,
    shareableUrl,
    shareableUrlLocatorParams,
    embedUrlParamExtensions,
    showPublicUrlSwitch,
    snapshotShareWarning,
    onClose,
    disabledShareUrl,
    isDirty,
    delegatedShareUrlHandler,
    publicAPIEnabled,
    ...startServices
  }: ShowShareMenuOptions & {
    anchorElement: HTMLElement;
    menuItems: ShareMenuItemV2[];
    onClose: () => void;
    isDirty: boolean;
    userProfile: UserProfileService;
    theme: ThemeServiceStart;
    i18n: CoreStart['i18n'];
  }) {
    if (this.isOpen) {
      onClose();
      return;
    }

    document.body.appendChild(this.container);

    // initialize variable that will hold reference for unmount
    let unmount: ReturnType<ReturnType<typeof toMountPoint>>;

    const mount = toMountPoint(
      <ShareMenu
        shareContext={{
          publicAPIEnabled,
          anchorElement,
          allowEmbed,
          allowShortUrl,
          objectId,
          objectType,
          objectTypeMeta,
          sharingData,
          shareableUrl,
          shareableUrlLocatorParams,
          delegatedShareUrlHandler,
          embedUrlParamExtensions,
          showPublicUrlSwitch,
          snapshotShareWarning,
          disabledShareUrl,
          isDirty,
          shareMenuItems: menuItems,
          onClose: () => {
            onClose();
            unmount();
          },
          ...startServices,
        }}
      />,
      startServices
    );

    const openModal = () => {
      unmount = mount(this.container);
      this.isOpen = true;
    };

    // @ts-ignore openModal() returns void
    anchorElement.onclick!(openModal());
  }
}

export type ShareMenuManagerStart = ReturnType<ShareMenuManager['start']>;
