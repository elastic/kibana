/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ShareModal } from '@kbn/share-modal';
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
  const getTabs = () => {
    const tabs: any[] = [];

    tabs.push({
      id: 'link',
      name: i18n.translate('share.contextMenu.permalinksTab', {
        defaultMessage: 'Links',
      }),
      // do not break functional tests
      dataTestSubj: 'Permalinks',
      content: (
        <LinkModal
          objectType={objectType}
          objectId={objectId}
          isDirty={isDirty}
          isEmbedded={isEmbedded}
          onClose={onClose}
          urlService={urlService}
        />
      ),
    });

    shareMenuItems.map(({ shareMenuItem, panel }) => {
      tabs.push({
        ...shareMenuItem,
        dataTestSubj: 'export',
        id: panel.id,
        content: panel.content,
      });
    });

    if (allowEmbed) {
      tabs.push({
        id: 'embed',
        name: i18n.translate('share.contextMenu.embedCodeTab', {
          defaultMessage: 'Embed',
        }),
        dataTestSubj: 'Embed',
        content: (
          <EmbedModal
            objectType={objectType}
            urlParamExtensions={embedUrlParamExtensions}
            urlService={urlService}
          />
        ),
      });
    }
    return tabs;
  };

  return <ShareModal objectType={objectType} onClose={onClose} tabs={getTabs()} />;
};
