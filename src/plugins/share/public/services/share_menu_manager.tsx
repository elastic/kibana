/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiWrappingPopover } from '@elastic/eui';

import { HttpStart, NotificationsStart, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { SavedObjectManagementTypeInfo } from '@kbn/saved-objects-management-plugin/common';
import { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { getAllowedTypes } from '@kbn/saved-objects-management-plugin/public/lib';
import { ShareContextMenu } from '../components/share_context_menu';
import { ShareMenuItem, ShowShareMenuOptions } from '../types';
import { ShareMenuRegistryStart } from './share_menu_registry';
import { AnonymousAccessServiceContract } from '../../common/anonymous_access';
import type { BrowserUrlService } from '../types';

const getTypes = async (core: CoreStart) => await getAllowedTypes(core.http);
export class ShareMenuManager {
  private isOpen = false;

  private container = document.createElement('div');

  start(
    core: CoreStart,
    urlService: BrowserUrlService,
    shareRegistry: ShareMenuRegistryStart,
    disableEmbed: boolean,
    taggingApi?: SavedObjectsTaggingApi,
    anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract
  ) {
    return {
      /**
       * Collects share menu items from registered providers and mounts the share context menu under
       * the given `anchorElement`. If the context menu is already opened, a call to this method closes it.
       * @param options
       */
      toggleShareContextMenu: async (options: ShowShareMenuOptions) => {
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
          notifications: core.notifications,
          http: core.http,
          taggingApi,
          allowedTypes: await getTypes(core),
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
    i18n,
    overlays,
    notifications,
    http,
    taggingApi,
    allowedTypes,
  }: ShowShareMenuOptions & {
    menuItems: ShareMenuItem[];
    urlService: BrowserUrlService;
    anonymousAccess: AnonymousAccessServiceContract | undefined;
    theme: ThemeServiceStart;
    onClose: () => void;
    i18n: CoreStart['i18n'];
    overlays: OverlayStart;
    notifications: NotificationsStart;
    http: HttpStart;
    taggingApi?: SavedObjectsTaggingApi;
    allowedTypes: SavedObjectManagementTypeInfo[];
  }) {
    if (this.isOpen) {
      onClose();
      return;
    }

    this.isOpen = true;

    document.body.appendChild(this.container);
    const element = (
      <I18nProvider>
        <KibanaThemeProvider theme$={theme.theme$}>
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
              openModal={overlays.openModal}
              theme={theme}
              i18nStart={i18n}
            />
          </EuiWrappingPopover>
        </KibanaThemeProvider>
      </I18nProvider>
    );
    ReactDOM.render(element, this.container);
  }
}
export type ShareMenuManagerStart = ReturnType<ShareMenuManager['start']>;
