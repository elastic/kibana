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
import { EuiWrappingPopover } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { ShareMenuItem, ShowShareMenuOptions } from '../types';
import { ShareMenuRegistryStart } from './share_menu_registry';
import { AnonymousAccessServiceContract } from '../../common/anonymous_access';
import type { BrowserUrlService } from '../types';
import { ShareMenuV2 } from '../components/share_tabs';
import { ShareContextMenu } from '../components/share_context_menu';

export class ShareMenuManager {
  private isOpen = false;

  private container = document.createElement('div');

  start(
    core: CoreStart,
    urlService: BrowserUrlService,
    shareRegistry: ShareMenuRegistryStart,
    disableEmbed: boolean,
    newVersionEnabled: boolean,
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
          newVersionEnabled,
          toasts: core.notifications.toasts,
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
    sharingData,
    menuItems,
    shareableUrl,
    shareableUrlForSavedObject,
    shareableUrlLocatorParams,
    embedUrlParamExtensions,
    theme,
    showPublicUrlSwitch,
    urlService,
    anonymousAccess,
    snapshotShareWarning,
    onClose,
    objectTypeTitle,
    disabledShareUrl,
    overlays,
    i18n,
    isDirty,
    newVersionEnabled,
    toasts,
    intl,
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
    newVersionEnabled: boolean;
    toasts: ToastsSetup;
  }) {
    if (this.isOpen) {
      onClose();
      return;
    }

    this.isOpen = true;
    document.body.appendChild(this.container);

    if (!newVersionEnabled) {
      const element = (
        <I18nProvider>
          <KibanaThemeProvider theme={theme}>
            <EuiWrappingPopover
              id="sharePopover"
              button={anchorElement}
              isOpen={true}
              closePopover={onClose}
              panelPaddingSize="none"
              anchorPosition="downLeft"
            >
              <ShareContextMenu
                allowEmbed={allowEmbed}
                allowShortUrl={allowShortUrl}
                objectId={objectId}
                objectType={objectType}
                objectTypeTitle={objectTypeTitle}
                shareMenuItems={menuItems}
                sharingData={sharingData}
                shareableUrl={shareableUrl}
                shareableUrlForSavedObject={shareableUrlForSavedObject}
                shareableUrlLocatorParams={shareableUrlLocatorParams}
                onClose={onClose}
                embedUrlParamExtensions={embedUrlParamExtensions}
                anonymousAccess={anonymousAccess}
                showPublicUrlSwitch={showPublicUrlSwitch}
                urlService={urlService}
                snapshotShareWarning={snapshotShareWarning}
                disabledShareUrl={disabledShareUrl}
              />
            </EuiWrappingPopover>
          </KibanaThemeProvider>
        </I18nProvider>
      );
      ReactDOM.render(element, this.container);
    } else if (newVersionEnabled) {
      const openModal = () => {
        const session = overlays.openModal(
          toMountPoint(
            <ShareMenuV2
              shareContext={{
                allowEmbed,
                allowShortUrl,
                objectId,
                objectType,
                objectTypeTitle,
                sharingData,
                shareableUrl,
                shareableUrlForSavedObject,
                shareableUrlLocatorParams,
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
                intl,
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
}

export type ShareMenuManagerStart = ReturnType<ShareMenuManager['start']>;
