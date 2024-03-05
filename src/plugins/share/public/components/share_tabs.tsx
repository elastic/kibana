/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import React from 'react';
// import { ShareModal } from '@kbn/share-modal';
import { EuiModal } from '@elastic/eui';
import { LocatorPublic, AnonymousAccessServiceContract } from '../../common';
import { ShareMenuItem, UrlParamExtension, BrowserUrlService } from '../types';
// import { LinkModal } from './link_modal';
// import { EmbedModal } from './embed_modal';

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
  return (
    <EuiModal onClose={onClose}>{'placeholder'}</EuiModal>
    // <ShareModal
    //   objectType={objectType}
    //   modalBodyDescriptions={getModalBodyDescriptions()}
    //   onClose={onClose}
    //   tabs={getTabs()}
    // />
  );
};
