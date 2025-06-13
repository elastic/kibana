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
import type { CoreStart } from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import type { ShowShareMenuOptions } from '../types';
import type { ShareMenuRegistryStart } from './share_menu_registry';
import type { AnonymousAccessServiceContract } from '../../common/anonymous_access';
import type { BrowserUrlService, ShareMenuItemV2 } from '../types';
import { ShareMenu } from '../components/share_tabs';

export class ShareMenuManager {
  private isOpen = false;

  private container = document.createElement('div');

  start(
    core: CoreStart,
    urlService: BrowserUrlService,
    shareRegistry: ShareMenuRegistryStart,
    disableEmbed: boolean,
    anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract
  ) {
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
        const menuItems = shareRegistry.getShareMenuItems({ ...options, onClose });
        const anonymousAccess = anonymousAccessServiceProvider?.();
        this.toggleShareContextMenu(
          {
            ...options,
            allowEmbed: disableEmbed ? false : options.allowEmbed,
            onClose,
            menuItems,
            urlService,
            anonymousAccess,
            publicAPIEnabled: !disableEmbed,
          },
          core.rendering
        );
      },
    };
  }

  private onClose = () => {
    ReactDOM.unmountComponentAtNode(this.container);
    this.isOpen = false;
  };

  private toggleShareContextMenu(
    {
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
      urlService,
      anonymousAccess,
      snapshotShareWarning,
      onClose,
      disabledShareUrl,
      isDirty,
      delegatedShareUrlHandler,
      publicAPIEnabled,
    }: ShowShareMenuOptions & {
      anchorElement: HTMLElement;
      menuItems: ShareMenuItemV2[];
      urlService: BrowserUrlService;
      anonymousAccess: AnonymousAccessServiceContract | undefined;
      onClose: () => void;
      isDirty: boolean;
    },
    rendering: RenderingService
  ) {
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
          anonymousAccess,
          showPublicUrlSwitch,
          urlService,
          snapshotShareWarning,
          disabledShareUrl,
          isDirty,
          shareMenuItems: menuItems,
          onClose: () => {
            onClose();
            unmount();
          },
        }}
      />,
      rendering
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
