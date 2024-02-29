/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import React, { useCallback } from 'react';
import { ShareModal } from '@kbn/share-modal';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { LocatorPublic, AnonymousAccessServiceContract } from '../../common';
import { ShareMenuItem, UrlParamExtension, BrowserUrlService } from '../types';
import { LinkModal } from './link_modal';
import { EmbedModal } from './embed_modal';

export interface ModalTabActionHandler {
  id: string;
  dataTestSubj: string;
  formattedMessageId: string;
  defaultMessage: string;
}

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
  isDirty: boolean;
  isEmbedded: boolean;
}

// this file is intended to replace share_context_menu
export const ShareMenuTabs = ({
  allowEmbed,
  shareMenuItems,
  urlService,
  onClose,
  objectType,
  embedUrlParamExtensions,
  objectId,
  isDirty,
  isEmbedded,
}: ShareContextTabProps) => {
  const actionHandler = useCallback(
    () => [
      {
        id: 'link',
        dataTestSubj: 'copyShareUrlButton',
        formattedMessageId: 'share.link.copyLinkButton',
        defaultMessage: 'Copy link',
      },
      {
        id: 'embed',
        dataTestSubj: 'copyEmbedUrlButton',
        formattedMessageId: 'share.link.copyEmbedCodeButton',
        defaultMessage: 'Copy Embed',
      },
      {
        id: 'export',
        dataTestSubj: 'generateExportButton',
        formattedMessageId: 'share.link.generateExportButton',
        defaultMessage: 'Generate export',
      },
    ],
    []
  );

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
      action: actionHandler().filter(({ id }) => id === 'link')[0],
      content: (
        <LinkModal
          objectType={objectType}
          objectId={objectId}
          isDirty={isDirty}
          isEmbedded={isEmbedded}
          onClose={onClose}
          action={actionHandler().filter(({ id }) => id === 'link')[0]}
        />
      ),
    });
    if (allowEmbed) {
      tabs.push({
        id: 'embed',
        name: i18n.translate('share.contextMenu.embedCodeLabel', {
          defaultMessage: 'Embed',
        }),
        sortOrder: 1,
        action: actionHandler().filter(({ id }) => id === 'embed')[0],
        content: (
          <EmbedModal
            urlParamExtensions={embedUrlParamExtensions}
            urlService={urlService}
            action={actionHandler().filter(({ id }) => id === 'embed')[0]}
          />
        ),
      });
    }

    shareMenuItems.map(({ shareMenuItem, panel }) => {
      tabs.push({
        ...shareMenuItem,
        id: panel.id,
        actionHandler: actionHandler().filter(({ id }) => id === id)[0],
      });
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
