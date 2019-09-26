/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';

import { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu } from '@elastic/eui';

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { ShareAction, ShareActionProvider, ShareContextMenuPanelItem } from 'ui/share/share_action';
import { UrlPanelContent } from './url_panel_content';

interface Props {
  allowEmbed: boolean;
  allowShortUrl: boolean;
  objectId?: string;
  objectType: string;
  getUnhashableStates: () => object[];
  shareContextMenuExtensions?: ShareActionProvider[];
  sharingData: any;
  isDirty: boolean;
  onClose: () => void;
  intl: InjectedIntl;
}

class ShareContextMenuUI extends Component<Props> {
  public render() {
    const { panels, initialPanelId } = this.getPanels();
    return (
      <EuiContextMenu
        initialPanelId={initialPanelId}
        panels={panels}
        data-test-subj="shareContextMenu"
      />
    );
  }

  private getPanels = () => {
    const panels: EuiContextMenuPanelDescriptor[] = [];
    const menuItems: ShareContextMenuPanelItem[] = [];
    const { intl } = this.props;

    const permalinkPanel = {
      id: panels.length + 1,
      title: intl.formatMessage({
        id: 'common.ui.share.contextMenu.permalinkPanelTitle',
        defaultMessage: 'Permalink',
      }),
      content: (
        <UrlPanelContent
          allowShortUrl={this.props.allowShortUrl}
          objectId={this.props.objectId}
          objectType={this.props.objectType}
          getUnhashableStates={this.props.getUnhashableStates}
        />
      ),
    };
    menuItems.push({
      name: intl.formatMessage({
        id: 'common.ui.share.contextMenu.permalinksLabel',
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
        title: intl.formatMessage({
          id: 'common.ui.share.contextMenu.embedCodePanelTitle',
          defaultMessage: 'Embed Code',
        }),
        content: (
          <UrlPanelContent
            allowShortUrl={this.props.allowShortUrl}
            isEmbedded
            objectId={this.props.objectId}
            objectType={this.props.objectType}
            getUnhashableStates={this.props.getUnhashableStates}
          />
        ),
      };
      panels.push(embedPanel);
      menuItems.push({
        name: intl.formatMessage({
          id: 'common.ui.share.contextMenu.embedCodeLabel',
          defaultMessage: 'Embed code',
        }),
        icon: 'console',
        panel: embedPanel.id,
        sortOrder: 0,
      });
    }

    if (this.props.shareContextMenuExtensions) {
      const {
        objectType,
        objectId,
        getUnhashableStates,
        sharingData,
        isDirty,
        onClose,
      } = this.props;
      this.props.shareContextMenuExtensions.forEach((provider: ShareActionProvider) => {
        provider
          .getShareActions({
            objectType,
            objectId,
            getUnhashableStates,
            sharingData,
            isDirty,
            onClose,
          })
          .forEach(({ shareMenuItem, panel }: ShareAction) => {
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
      });
    }

    if (menuItems.length > 1) {
      const topLevelMenuPanel = {
        id: panels.length + 1,
        title: intl.formatMessage(
          {
            id: 'common.ui.share.contextMenuTitle',
            defaultMessage: 'Share this {objectType}',
          },
          {
            objectType: this.props.objectType,
          }
        ),
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
          .map(menuItem => {
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

export const ShareContextMenu = injectI18n(ShareContextMenuUI);
