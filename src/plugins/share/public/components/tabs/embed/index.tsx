/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
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
    case EMBED_TAB_ACTIONS.SET_IS_NOT_SAVED:
      return {
        ...state,
        isNotSaved: action.payload,
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
  const { embedUrlParamExtensions, shareableUrlForSavedObject, shareableUrl, objectType, isDirty } =
    useShareTabsContext()!;

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
        objectType,
        isNotSaved: state?.isNotSaved,
        setIsNotSaved,
      }}
    />
  );
};

export const embedTab: IEmbedTab = {
  id: 'embed',
  name: i18n.translate('share.contextMenu.embedCodeTab', {
    defaultMessage: 'Embed',
  }),
  reducer: embedTabReducer,
  content: EmbedTabContent,
};
