/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import React, { useState } from 'react';
import { IModalTabDeclaration, TabbedModal } from '@kbn/shared-ux-tabbed-modal';
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
  const [linkData, setLinkData] = useState<string | undefined>(undefined);
  const [embedData, setEmbedData] = useState<{} | undefined>(undefined);

  const getTabs = () => {
    const tabs: Array<
      IModalTabDeclaration<{
        shortUrlCache: string;
        url: string;
        urlParams(urlParams: any): unknown;
        id: string;
        dataTestSubj: string;
        defaultMessage: string;
        handler: () => void;
      }>
    > = [];
    tabs.push({
      id: 'link',
      name: i18n.translate('share.contextMenu.permalinksTab', {
        defaultMessage: 'Links',
      }),
      // do not break functional tests
      'data-test-subj': 'Permalinks',
      modalActionBtn: {
        id: 'link',
        dataTestSubj: 'copyShareUrlButton',
        formattedMessageId: 'share.link.copyLinkButton',
        defaultMessage: 'Copy link',
        handler: ({ state }) => {
          setLinkData(state.shortUrlCache ?? state.url);
        },
      },
      title: `Share this ${objectType}`,
      description: (
        <FormattedMessage
          id="share.dashboard.link.description"
          defaultMessage="Share a direct link to this search."
        />
      ),
      content: () => (
        <LinkModal
          objectType={objectType}
          objectId={objectId}
          isDirty={isDirty}
          isEmbedded={isEmbedded}
          onClose={onClose}
          urlService={urlService}
        />
      ),
      reducer(state, action) {
        switch (action.type) {
          default:
            return state;
        }
      },
    });

    shareMenuItems.map(({ shareMenuItem, panel }) => {
      tabs.push({
        ...shareMenuItem,
        id: panel.id.toString(),
        title: `Share this ${objectType}`,
        modalActionBtn: {
          id: 'export',
          dataTestSubj: 'generateExportButton',
          formattedMessageId: 'share.link.generateExportButton',
          defaultMessage: 'Generate export',
        },
        reducer(state, action) {
          switch (action.type) {
            default:
              return state;
          }
        },
      });
    });

    if (allowEmbed) {
      tabs.push({
        id: 'embed',
        name: i18n.translate('share.contextMenu.embedCodeTab', {
          defaultMessage: 'Embed',
        }),
        description: (
          <FormattedMessage
            id="share.dashboard.embed.description"
            defaultMessage="Embed this dashboard into another webpage. Select which menu items to include in the embeddable view."
          />
        ),
        title: `Share this ${objectType}`,
        modalActionBtn: {
          id: 'embed',
          dataTestSubj: 'copyEmbedUrlButton',
          formattedMessageId: 'share.link.copyEmbedCodeButton',
          defaultMessage: 'Copy Embed',
          handler: ({ state }) => {
            setEmbedData(state.urlParams);
          },
        },
        content: ({ state, dispatch }) => {
          const onChange = (optionId) => {
            const newCheckboxIdToSelectedMap = {
              embedUrlParamExtensions,
            };

            dispatch({
              type: '0',
              payload: newCheckboxIdToSelectedMap,
            });
          };
          return (
            <EmbedModal urlParamExtensions={embedUrlParamExtensions} urlService={urlService} />
          );
        },
        reducer(state, action) {
          switch (action.type) {
            default:
              return state;
          }
        },
      });
    }
    return tabs;
  };

  return <TabbedModal onClose={onClose} tabs={getTabs()} selectedTabId="link" />;
};
