/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import React from 'react';
import { ShareModal } from '@kbn/share-modal';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { LocatorPublic, AnonymousAccessServiceContract } from '../../common';
import { ShareMenuItem, UrlParamExtension, BrowserUrlService } from '../types';
import { LinkModal } from './link_modal';
import { EmbedModal } from './embed_modal';

export interface ShareContextTabProps {
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

// this file is intended to replace share_context_menu
export const ShareMenuTabs = ({
  allowEmbed,
  shareMenuItems,
  urlService,
  onClose,
  objectType,
  embedUrlParamExtensions,
}: ShareContextTabProps) => {
  const getTabs = () => {
    const tabs = [];

    tabs.push({
      id: 'link',
      name: i18n.translate('share.contextMenu.permalinksLabel', {
        defaultMessage: 'Links',
      }),
      sortOrder: 0,
      // do not break functional tests
      'data-test-subj': 'Permalinks',
      content: <LinkModal objectType={objectType} />,
    });
    if (allowEmbed) {
      tabs.push({
        id: 'embed',
        name: i18n.translate('share.contextMenu.embedCodeLabel', {
          defaultMessage: 'Embed',
        }),
        sortOrder: 1,
        content: (
          <EmbedModal urlParamExtensions={embedUrlParamExtensions} urlService={urlService} />
        ),
      });
    }

    shareMenuItems.map((item) => {
      console.log(item);
    });
    return tabs;
  };

  const getModalBodyDescriptions = () => [
    {
      id: 'dashboard-link',
      description: (
        <FormattedMessage
          id="share.dashboard.link.description"
          defaultMessage="Share a direct link to this search."
        />
      ),
    },
    {
      id: 'dashboard-embed',
      description: (
        <FormattedMessage
          id="share.dashboard.embed.description"
          defaultMessage="Embed this dashboard into another webpage. Select which menu items to include in the embeddable view."
        />
      ),
    },
  ];

  return (
    <ShareModal
      objectType={objectType}
      modalBodyDescriptions={getModalBodyDescriptions()}
      onClose={onClose}
      tabs={getTabs()}
    />
  );
};
