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
import { ShareRegistry } from './share_menu_registry';
import type { ShareConfigs } from '../types';
import { ShareMenu } from '../components/share_tabs';
import { ExportMenu } from '../components/export_popover';

interface ShareMenuManagerStartDeps {
  core: CoreStart;
  isServerless: boolean;
  resolveShareItemsForShareContext: ShareRegistry['resolveShareItemsForShareContext'];
}

export class ShareMenuManager {
  private isOpen = false;
  private container = document.createElement('div');

  start({ core, resolveShareItemsForShareContext, isServerless }: ShareMenuManagerStartDeps) {
    return {
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

        const menuItems = resolveShareItemsForShareContext({
          ...options,
          isServerless,
          onClose,
        });

        this.toggleShareContextMenu({
          ...options,
          onClose,
          menuItems,
          publicAPIEnabled: !isServerless,
          ...core,
        });
      },
    };
  }

  private onClose = () => {
    ReactDOM.unmountComponentAtNode(this.container);
    this.isOpen = false;
  };

  private toggleShareContextMenu({
    anchorElement,
    allowShortUrl,
    objectId,
    objectType,
    objectTypeMeta,
    sharingData,
    menuItems,
    shareableUrl,
    shareableUrlLocatorParams,
    onClose,
    isDirty,
    asExport,
    publicAPIEnabled,
    ...startServices
  }: ShowShareMenuOptions & {
    menuItems: ShareConfigs[];
    onClose: () => void;
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
      React.createElement(asExport ? ExportMenu : ShareMenu, {
        shareContext: {
          objectId,
          objectType,
          objectTypeMeta,
          anchorElement,
          publicAPIEnabled,
          allowShortUrl,
          sharingData,
          shareableUrl,
          shareableUrlLocatorParams,
          isDirty,
          shareMenuItems: menuItems,
          onClose: () => {
            onClose();
            unmount();
          },
          ...startServices,
        },
      }),
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
