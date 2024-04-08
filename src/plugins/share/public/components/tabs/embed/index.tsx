/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { copyToClipboard } from '@elastic/eui';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { EmbedContent } from './embed_content';
import { useShareTabsContext } from '../../context';

const EMBED_TAB_ACTIONS = {
  SET_EMBED_URL: 'SET_EMBED_URL',
  SET_IS_NOT_SAVED: 'SET_IS_NOT_SAVED',
};

type IEmbedTab = IModalTabDeclaration<{ url: string; isNotSaved: boolean }>;

const embedTabReducer: IEmbedTab['reducer'] = (state = { url: '', isNotSaved: false }, action) => {
  switch (action.type) {
    case EMBED_TAB_ACTIONS.SET_EMBED_URL:
      return {
        ...state,
        url: action.payload,
      };
    case EMBED_TAB_ACTIONS.SET_IS_NOT_SAVED:
      return {
        ...state,
        isNotSaved: action.payload,
      };
    default:
      return state;
  }
};

const EmbedTabContent: NonNullable<IEmbedTab['content']> = ({ state, dispatch }) => {
  const {
    embedUrlParamExtensions,
    shareableUrlForSavedObject,
    shareableUrl,
    isEmbedded,
    objectType,
    isDirty,
  } = useShareTabsContext()!;

  const onChange = useCallback(
    (shareUrl: string) => {
      dispatch({
        type: EMBED_TAB_ACTIONS.SET_EMBED_URL,
        payload: shareUrl,
      });
    },
    [dispatch]
  );

  const setIsNotSaved = useCallback(() => {
    dispatch({
      type: EMBED_TAB_ACTIONS.SET_IS_NOT_SAVED,
      payload: objectType === 'dashboard' ? isDirty : false,
    });
  }, [dispatch, objectType, isDirty]);

  return (
    <EmbedContent
      {...{
        embedUrlParamExtensions,
        shareableUrlForSavedObject,
        shareableUrl,
        isEmbedded,
        objectType,
        isDirty,
        isNotSaved: state?.isNotSaved,
        setIsNotSaved,
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
  description: i18n.translate('share.dashboard.embed.description', {
    defaultMessage:
      'Embed this dashboard into another webpage. Select which menu items to include in the embeddable view.',
  }),
  reducer: embedTabReducer,
  content: EmbedTabContent,
  modalActionBtn: {
    id: 'embed',
    dataTestSubj: 'copyEmbedUrlButton',
    label: i18n.translate('share.link.copyEmbedCodeButton', {
      defaultMessage: 'Copy Embed',
    }),
    handler: ({ state }) => {
      copyToClipboard(state.url);
    },
    style: ({ state }) => state.isNotSaved,
  },
};
