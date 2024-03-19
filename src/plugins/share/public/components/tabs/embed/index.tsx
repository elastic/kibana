/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { copyToClipboard } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { EmbedContent } from './embed_content';
import { useShareTabsContext } from '../../context';

type IEmbedTab = IModalTabDeclaration<{ url: string }>;

const embedTabReducer: IEmbedTab['reducer'] = (state, action) => {
  switch (action.type) {
    case String(1):
      return {
        ...state,
        url: action.payload,
      };
    default:
      return state;
  }
};

const EmbedTabContent: NonNullable<IEmbedTab['content']> = ({ dispatch }) => {
  const { embedUrlParamExtensions, shareableUrlForSavedObject, shareableUrl, isEmbedded } =
    useShareTabsContext()!;
  const onChange = (shareUrl: string) => {
    dispatch({
      type: '1',
      payload: shareUrl,
    });
  };

  return (
    <EmbedContent
      {...{
        embedUrlParamExtensions,
        shareableUrlForSavedObject,
        shareableUrl,
        isEmbedded,
      }}
      onChange={onChange}
    />
  );
};

export const embedTab: IEmbedTab = {
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
  reducer: embedTabReducer,
  content: EmbedTabContent,
  modalActionBtn: {
    id: 'embed',
    dataTestSubj: 'copyEmbedUrlButton',
    formattedMessageId: 'share.link.copyEmbedCodeButton',
    defaultMessage: 'Copy Embed',
    handler: ({ state }) => {
      copyToClipboard(state.url);
    },
  },
};
