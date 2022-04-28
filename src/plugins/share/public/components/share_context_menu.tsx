/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';

import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenu, EuiContextMenuPanelDescriptor } from '@elastic/eui';

import type { Capabilities } from '@kbn/core/public';

import { UrlPanelContent } from './url_panel_content';
import { ShareMenuItem, ShareContextMenuPanelItem, UrlParamExtension } from '../types';
import { AnonymousAccessServiceContract } from '../../common/anonymous_access';
import type { BrowserUrlService } from '../types';

export interface ShareContextMenuProps {
  allowEmbed: boolean;
  allowShortUrl: boolean;
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  shareMenuItems: ShareMenuItem[];
  sharingData: any;
  onClose: () => void;
  embedUrlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
}

export class ShareContextMenu extends Component<ShareContextMenuProps> {
  public render() {
    const panels = this.getPanels();
    return (
      <I18nProvider>
        <EuiContextMenu initialPanelId={0} panels={panels} data-test-subj="shareContextMenu" />
      </I18nProvider>
    );
  }

  private getPanels = () => {
    const topLevelMenu: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: i18n.translate('share.contextMenuTitle', {
          defaultMessage: 'Share the {objectType}',
          values: {
            objectType: this.props.objectType,
          },
        }),
        items: [],
      },
    ];
    let menuItems: ShareContextMenuPanelItem[] = [];

    menuItems.push(
      {
        name: i18n.translate('share.contextMenu.permalinksLabel', {
          defaultMessage: 'Get link',
        }),
        icon: 'link',
        panel: 'permaLinksPanel',
        sortOrder: 0,
      },
      {
        name: i18n.translate('share.contextMenu.exportLabel', {
          defaultMessage: 'Export',
        }),
        icon: 'exportAction',
        panel: 'exportActionPanel',
        sortOrder: 2,
      }
    );

    const permalinkPanel = {
      id: 'permaLinksPanel',
      title: i18n.translate('share.contextMenu.permalinkPanelTitle', {
        defaultMessage: 'Get link',
      }),
      content: (
        <UrlPanelContent
          allowShortUrl={this.props.allowShortUrl}
          objectId={this.props.objectId}
          objectType={this.props.objectType}
          shareableUrl={this.props.shareableUrl}
          anonymousAccess={this.props.anonymousAccess}
          showPublicUrlSwitch={this.props.showPublicUrlSwitch}
          urlService={this.props.urlService}
        />
      ),
    };
    topLevelMenu.push(permalinkPanel);

    const exportPanel = {
      id: 'exportActionPanel',
      title: i18n.translate('share.contextMenu.exportPanelTitle', {
        defaultMessage: 'Export',
      }),
      items: [] as ShareContextMenuPanelItem[],
    };
    this.props.shareMenuItems.forEach(({ shareMenuItem, panel }) => {
      exportPanel.items.push({ ...shareMenuItem, panel: panel.id });
      topLevelMenu.push(panel);
    });
    topLevelMenu.push(exportPanel);

    if (this.props.allowEmbed) {
      menuItems.push({
        name: i18n.translate('share.contextMenu.embedCodeLabel', {
          defaultMessage: 'Embed code',
        }),
        icon: 'console',
        panel: 'embedCodePanel',
        sortOrder: 1,
      });

      const embedPanel = {
        id: 'embedCodePanel',
        title: i18n.translate('share.contextMenu.embedCodePanelTitle', {
          defaultMessage: 'Embed Code',
        }),
        content: (
          <UrlPanelContent
            allowShortUrl={this.props.allowShortUrl}
            isEmbedded
            objectId={this.props.objectId}
            objectType={this.props.objectType}
            shareableUrl={this.props.shareableUrl}
            urlParamExtensions={this.props.embedUrlParamExtensions}
            anonymousAccess={this.props.anonymousAccess}
            showPublicUrlSwitch={this.props.showPublicUrlSwitch}
            urlService={this.props.urlService}
          />
        ),
      };
      topLevelMenu.push(embedPanel);
    }

    if (menuItems.length > 1) {
      // Sorts ascending on sort order first and then ascending on name
      menuItems = menuItems.sort((a, b) => {
        const aSortOrder = a.sortOrder || 0;
        const bSortOrder = b.sortOrder || 0;
        if (aSortOrder > bSortOrder) {
          return 1;
        }
        if (aSortOrder < bSortOrder) {
          return -1;
        }
        if (a.name.toLowerCase().localeCompare(b.name.toLowerCase()) > 0) {
          return 1;
        }
        return -1;
      });
    }
    menuItems.map((menuItem) => {
      menuItem['data-test-subj'] = `sharePanel-${menuItem.name.replace(' ', '')}`;
      delete menuItem.sortOrder;
      return menuItem;
    });
    topLevelMenu[0].items = menuItems;

    return topLevelMenu;
  };
}
