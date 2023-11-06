/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import {
  EuiContextMenuPanelDescriptor,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiTab,
} from '@elastic/eui';
import { Capabilities } from '@kbn/core-capabilities-common';
import { i18n } from '@kbn/i18n';
import { LocatorPublic, AnonymousAccessServiceContract } from '../../../common';
import {
  BrowserUrlService,
  ShareContextMenuPanelItem,
  ShareMenuItem,
  UrlParamExtension,
} from '../../types';

export interface ShareModalProps {
  allowEmbed: boolean;
  allowShortUrl: boolean;
  objectId?: string;
  objectType: string;
  shareableUrl?: string;
  shareableUrlForSavedObject?: string;
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  shareMenuItems: ShareMenuItem[];
  sharingData: any;
  onClose: () => void;
  embedUrlParamExtensions?: UrlParamExtension[];
  anonymousAccess?: AnonymousAccessServiceContract;
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  urlService: BrowserUrlService;
  snapshotShareWarning?: string;
  objectTypeTitle?: string;
  disabledShareUrl?: boolean;
}

const getTabs = (
  shareMenuItems: ShareMenuItem[],
  objectTypeTitle: string | undefined,
  objectType: string,
  disabledShareUrl: boolean,
  allowEmbed: boolean
) => {
  const tabs: EuiContextMenuPanelDescriptor[] = [];
  const menuItems: ShareContextMenuPanelItem[] = [];

  const permalinkPanel = {
    id: tabs.length + 1,
    title: i18n.translate('share.contextMenu.permalinkPanelTitle', {
      defaultMessage: 'Get link',
    }),
    // content: (
    // <UrlPanelContent
    //   allowShortUrl={this.props.allowShortUrl}
    //   objectId={this.props.objectId}
    //   objectType={this.props.objectType}
    //   shareableUrl={this.props.shareableUrl}
    //   shareableUrlForSavedObject={this.props.shareableUrlForSavedObject}
    //   shareableUrlLocatorParams={this.props.shareableUrlLocatorParams}
    //   anonymousAccess={this.props.anonymousAccess}
    //   showPublicUrlSwitch={this.props.showPublicUrlSwitch}
    //   urlService={this.props.urlService}
    //   snapshotShareWarning={this.props.snapshotShareWarning}
    // />
    // ),
  };
  menuItems.push({
    name: i18n.translate('share.contextMenu.permalinksLabel', {
      defaultMessage: 'Get links',
    }),
    icon: 'link',
    panel: permalinkPanel.id,
    sortOrder: 0,
    disabled: Boolean(disabledShareUrl),
    // do not break functional tests
    'data-test-subj': 'Permalinks',
  });
  tabs.push(permalinkPanel);
  if (allowEmbed) {
    const embedPanel = {
      id: tabs.length + 1,
      title: i18n.translate('share.contextMenu.embedCodePanelTitle', {
        defaultMessage: 'Embed Code',
      }),
      // content: (
      //   <UrlPanelContent
      //     allowShortUrl={this.props.allowShortUrl}
      //     isEmbedded
      //     objectId={this.props.objectId}
      //     objectType={this.props.objectType}
      //     shareableUrl={this.props.shareableUrl}
      //     shareableUrlForSavedObject={this.props.shareableUrlForSavedObject}
      //     shareableUrlLocatorParams={this.props.shareableUrlLocatorParams}
      //     urlParamExtensions={this.props.embedUrlParamExtensions}
      //     anonymousAccess={this.props.anonymousAccess}
      //     showPublicUrlSwitch={this.props.showPublicUrlSwitch}
      //     urlService={this.props.urlService}
      //     snapshotShareWarning={this.props.snapshotShareWarning}
      //   />
      // ),
    };
    tabs.push(embedPanel);
    menuItems.push({
      name: i18n.translate('share.contextMenu.embedCodeLabel', {
        defaultMessage: 'Embed code',
      }),
      icon: 'console',
      panel: embedPanel.id,
      sortOrder: 0,
    });
  }
  shareMenuItems.forEach(({ shareMenuItem, panel }) => {
    const panelId = tabs.length + 1;
    tabs.push({
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
      id: tabs.length + 1,
      title: i18n.translate('share.contextMenuTitle', {
        defaultMessage: 'Share this {objectType}',
        values: {
          objectType: objectTypeTitle || objectType,
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
          menuItem['data-test-subj'] = `sharePanel-${
            menuItem['data-test-subj'] ?? menuItem.name.replace(' ', '')
          }`;
          delete menuItem.sortOrder;
          return menuItem;
        }),
    };
    tabs.push(topLevelMenuPanel);
  }
  const initialTabId = tabs[tabs.length - 1].title;
  return { tabs, initialTabId };
};

export const ShareUxModal: FC<ShareModalProps> = (props: ShareModalProps) => {
  const {
    shareMenuItems,
    objectTypeTitle,
    objectType,
    disabledShareUrl = true,
    allowEmbed,
  } = props;
  const [_, setIsModalVisible] = useState(false);
  const closeModal = () => setIsModalVisible(false);
  const [selectedTabId, setSelectedTabId] = useState('');
  const onSelectedTab = (id: any) => {
    setSelectedTabId(id);
  };
  const { tabs, initialTabId } = getTabs(
    shareMenuItems,
    objectTypeTitle,
    objectType,
    disabledShareUrl,
    allowEmbed
  );

  return (
    <I18nProvider>
      <EuiOverlayMask>
        <EuiModal onClose={closeModal} data-test-subject="shareContextModal">
          <EuiModalHeader>
            <EuiModalHeaderTitle>{initialTabId}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {' '}
            {tabs.map((t, i) => {
              <EuiTab
                onClick={() => onSelectedTab(t.id)}
                isSelected={t.id === selectedTabId}
                key={i}
              >
                {t.title}
              </EuiTab>;
            })}
          </EuiModalBody>
        </EuiModal>
      </EuiOverlayMask>
    </I18nProvider>
  );
};
