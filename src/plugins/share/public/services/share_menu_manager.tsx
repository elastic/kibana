/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CoreStart, OverlayStart, ThemeServiceStart, ToastsSetup } from '@kbn/core/public';
import { ShareMenuItem, ShowShareMenuOptions } from '../types';
import { ShareMenuRegistryStart } from './share_menu_registry';
import { AnonymousAccessServiceContract } from '../../common/anonymous_access';
import type { BrowserUrlService } from '../types';
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
        this.toggleShareContextMenu({
          ...options,
          allowEmbed: disableEmbed ? false : options.allowEmbed,
          onClose,
          menuItems,
          urlService,
          anonymousAccess,
          theme: core.theme,
          overlays: core.overlays,
          i18n: core.i18n,
          toasts: core.notifications.toasts,
          publicAPIEnabled: !disableEmbed,
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
    theme,
    showPublicUrlSwitch,
    urlService,
    anonymousAccess,
    snapshotShareWarning,
    onClose,
    disabledShareUrl,
    overlays,
    i18n,
    isDirty,
    toasts,
    delegatedShareUrlHandler,
    publicAPIEnabled,
  }: ShowShareMenuOptions & {
    anchorElement: HTMLElement;
    menuItems: ShareMenuItem[];
    urlService: BrowserUrlService;
    anonymousAccess: AnonymousAccessServiceContract | undefined;
    theme: ThemeServiceStart;
    onClose: () => void;
    overlays: OverlayStart;
    i18n: CoreStart['i18n'];
    isDirty: boolean;
    toasts: ToastsSetup;
  }) {
    if (this.isOpen) {
      onClose();
      return;
    }

    this.isOpen = true;
    document.body.appendChild(this.container);

    const openModal = () => {
      const session = overlays.openModal(
        toMountPoint(
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
              isEmbedded: allowEmbed,
              shareMenuItems: menuItems,
              toasts,
              onClose: () => {
                onClose();
                session.close();
              },
              theme,
              i18n,
            }}
          />,
          { i18n, theme }
        ),
        { 'data-test-subj': 'share-modal' }
      );
    };

    // @ts-ignore openModal() returns void
    anchorElement.onclick!(openModal());
  }
}

export type ShareMenuManagerStart = ReturnType<ShareMenuManager['start']>;
