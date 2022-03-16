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

import { CoreStart, ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../kibana_react/public';
import { ShareContextMenu } from '../components/share_context_menu';
import { ShareMenuItem, ShowShareMenuOptions } from '../types';
import { ShareMenuRegistryStart } from './share_menu_registry';
import { AnonymousAccessServiceContract } from '../../common/anonymous_access';
import type { BrowserUrlService } from '../types';

export class ShareMenuManager {
  private isOpen = false;

  private container = document.createElement('div');

  start(
    core: CoreStart,
    urlService: BrowserUrlService,
    shareRegistry: ShareMenuRegistryStart,
    anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract
  ) {
    return {
      /**
       * Collects share menu items from registered providers and mounts the share context menu under
       * the given `anchorElement`. If the context menu is already opened, a call to this method closes it.
       * @param options
       */
      toggleShareContextMenu: (options: ShowShareMenuOptions) => {
        const menuItems = shareRegistry.getShareMenuItems({ ...options, onClose: this.onClose });
        const anonymousAccess = anonymousAccessServiceProvider?.();
        this.toggleShareContextMenu({
          ...options,
          menuItems,
          urlService,
          anonymousAccess,
          theme: core.theme,
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
    embedUrlParamExtensions,
    theme,
    showPublicUrlSwitch,
    urlService,
    anonymousAccess,
  }: ShowShareMenuOptions & {
    menuItems: ShareMenuItem[];
    urlService: BrowserUrlService;
    anonymousAccess: AnonymousAccessServiceContract | undefined;
    theme: ThemeServiceStart;
  }) {
    if (this.isOpen) {
      this.onClose();
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
            closePopover={this.onClose}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <ShareContextMenu
              allowEmbed={allowEmbed}
              allowShortUrl={allowShortUrl}
              objectId={objectId}
              objectType={objectType}
              shareMenuItems={menuItems}
              sharingData={sharingData}
              shareableUrl={shareableUrl}
              onClose={this.onClose}
              embedUrlParamExtensions={embedUrlParamExtensions}
              anonymousAccess={anonymousAccess}
              showPublicUrlSwitch={showPublicUrlSwitch}
              urlService={urlService}
            />
          </EuiWrappingPopover>
        </KibanaThemeProvider>
      </I18nProvider>
    );
    ReactDOM.render(element, this.container);
  }
}
export type ShareMenuManagerStart = ReturnType<ShareMenuManager['start']>;
