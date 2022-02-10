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

import type { Capabilities } from 'src/core/public';

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
    const { panels, initialPanelId } = this.getPanels();
    return (
      <I18nProvider>
        <EuiContextMenu
          initialPanelId={initialPanelId}
          panels={panels}
          data-test-subj="shareContextMenu"
        />
      </I18nProvider>
    );
  }

  private getPanels = () => {
    const panels: EuiContextMenuPanelDescriptor[] = [];
    const menuItems: ShareContextMenuPanelItem[] = [];

    const permalinkPanel = {
      id: panels.length + 1,
      title: i18n.translate('share.contextMenu.permalinkPanelTitle', {
        defaultMessage: 'Permalink',
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
    menuItems.push({
      name: i18n.translate('share.contextMenu.permalinksLabel', {
        defaultMessage: 'Permalinks',
      }),
      icon: 'link',
      panel: permalinkPanel.id,
      sortOrder: 0,
    });
    panels.push(permalinkPanel);

    if (this.props.allowEmbed) {
      const embedPanel = {
        id: panels.length + 1,
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
      panels.push(embedPanel);
      menuItems.push({
        name: i18n.translate('share.contextMenu.embedCodeLabel', {
          defaultMessage: 'Embed code',
        }),
        icon: 'console',
        panel: embedPanel.id,
        sortOrder: 0,
      });
    }

    this.props.shareMenuItems.forEach(({ shareMenuItem, panel }) => {
      const panelId = panels.length + 1;
      panels.push({
        ...panel,
        id: panelId,
      });
      menuItems.push({
        ...shareMenuItem,
        panel: panelId,
      });
    });

    if (menuItems.length > 1) {
      const topLevelMenuPanel = {
        id: panels.length + 1,
        title: i18n.translate('share.contextMenuTitle', {
          defaultMessage: 'Share this {objectType}',
          values: {
            objectType: this.props.objectType,
          },
        }),
        items: menuItems
          // Sorts ascending on sort order first and then ascending on name
          .sort((a, b) => {
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
          })
          .map((menuItem) => {
            menuItem['data-test-subj'] = `sharePanel-${menuItem.name.replace(' ', '')}`;
            delete menuItem.sortOrder;
            return menuItem;
          }),
      };
      panels.push(topLevelMenuPanel);
    }

    const lastPanelIndex = panels.length - 1;
    const initialPanelId = panels[lastPanelIndex].id;
    return { panels, initialPanelId };
  };
}
