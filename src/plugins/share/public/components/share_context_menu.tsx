/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component } from 'react';

import { I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenu, EuiContextMenuPanelDescriptor } from '@elastic/eui';

import { HttpStart } from 'kibana/public';

import { UrlPanelContent } from './url_panel_content';
import { ShareMenuItem, ShareContextMenuPanelItem, UrlParamExtension } from '../types';

interface Props {
  allowEmbed: boolean;
  allowShortUrl: boolean;
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  shareMenuItems: ShareMenuItem[];
  sharingData: any;
  onClose: () => void;
  basePath: string;
  post: HttpStart['post'];
  embedUrlParamExtensions?: UrlParamExtension[];
}

export class ShareContextMenu extends Component<Props> {
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
          basePath={this.props.basePath}
          post={this.props.post}
          shareableUrl={this.props.shareableUrl}
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
            basePath={this.props.basePath}
            post={this.props.post}
            shareableUrl={this.props.shareableUrl}
            urlParamExtensions={this.props.embedUrlParamExtensions}
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
