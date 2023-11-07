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
  EuiTabbedContent,
  EuiTabbedContentTab,
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
import { TabContent } from './tab_content';
import { LinksModalPage } from './links_modal_page';
import { EmbedModalPage } from './embed_modal_page';

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

const getTabs = (props: ShareModalProps) => {
  const {
    shareMenuItems,
    objectTypeTitle,
    objectType,
    disabledShareUrl = true,
    allowEmbed,
    allowShortUrl,
    objectId = '',
    urlService,
    shareableUrl,
    shareableUrlForSavedObject,
    shareableUrlLocatorParams,
    embedUrlParamExtensions,
    anonymousAccess,
    showPublicUrlSwitch,
    snapshotShareWarning,
  } = props;
  const tabs: EuiContextMenuPanelDescriptor[] = [];
  const menuItems: ShareContextMenuPanelItem[] = [];

  const permalinkPanel = {
    id: tabs.length + 1,
    title: i18n.translate('share.contextModal.permalinkPanelTitle', {
      defaultMessage: 'Links',
    }),
    content: (
      <>
        <LinksModalPage
          isEmbedded={props.allowEmbed}
          allowShortUrl={props.allowShortUrl}
          objectType={props.objectType}
        />
      </>
    ),
  };
  menuItems.push({
    name: i18n.translate('share.contextModal.permalinksLabel', {
      defaultMessage: 'Links',
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
      title: i18n.translate('share.contextModal.embedCodePanelTitle', {
        defaultMessage: 'Embed',
      }),
      content: (
        <>
          <EmbedModalPage />
          <TabContent
            allowShortUrl={allowShortUrl}
            isEmbedded
            objectId={objectId}
            objectType={objectType}
            urlService={urlService}
            shareableUrl={shareableUrl}
            shareableUrlForSavedObject={shareableUrlForSavedObject}
            shareableUrlLocatorParams={shareableUrlLocatorParams}
            urlParamExtensions={embedUrlParamExtensions}
            anonymousAccess={anonymousAccess}
            showPublicUrlSwitch={showPublicUrlSwitch}
            snapshotShareWarning={snapshotShareWarning}
          />
        </>
      ),
    };
    tabs.push(embedPanel);
    menuItems.push({
      name: i18n.translate('share.contextModal.embedCodeLabel', {
        defaultMessage: 'Embed',
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
      title: i18n.translate('share.contextModalTitle', {
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
  const initialTabTitle = tabs[tabs.length - 1].title;
  return { tabs, initialTabTitle };
};

export const ShareUxModal: FC<ShareModalProps> = (props: ShareModalProps) => {
  const [_, setIsModalVisible] = useState(false);
  const closeModal = () => setIsModalVisible(false);

  const { tabs, initialTabTitle } = getTabs(props);
  const formattedTabs: any = [];
  tabs.map((t, i) => {
    // if (i < tabs.length -1){
    formattedTabs.push({
      name: t.title,
      title: t.title,
      id: i,
      content: t.content,
    });
    // }
  });

  const [selectedTab, setSelectedTab] = useState(formattedTabs[0]);

  const onTabClick = (selectTab: EuiTabbedContentTab) => {
    setSelectedTab(selectTab);
  };

  return (
    <I18nProvider>
      <EuiOverlayMask>
        <EuiModal onClose={closeModal} data-test-subject="shareContextModal" maxWidth>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{initialTabTitle}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiTabbedContent
              tabs={formattedTabs}
              selectedTab={selectedTab}
              onTabClick={onTabClick}
              data-test-subject="shareModalTabs"
            />
          </EuiModalBody>
        </EuiModal>
      </EuiOverlayMask>
    </I18nProvider>
  );
};
