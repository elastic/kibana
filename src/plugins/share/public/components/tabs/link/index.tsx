/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { copyToClipboard } from '@elastic/eui';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { useShareTabsContext } from '../../context';
import { LinkContent } from './link_content';

type ILinkTab = IModalTabDeclaration<{
  dashboardUrl: string;
  isNotSaved: boolean;
}>;

const LINK_TAB_ACTIONS = {
  SET_DASHBOARD_URL: 'SET_DASHBOARD_URL',
  SET_IS_NOT_SAVED: 'SET_IS_NOT_SAVED',
};

const linkTabReducer: ILinkTab['reducer'] = (
  state = {
    dashboardUrl: '',
    isNotSaved: false,
  },
  action
) => {
  switch (action.type) {
    case LINK_TAB_ACTIONS.SET_DASHBOARD_URL:
      return {
        ...state,
        dashboardUrl: action.payload,
      };
    case LINK_TAB_ACTIONS.SET_IS_NOT_SAVED:
      return {
        ...state,
        isNotSaved: action.payload,
      };
    default:
      return state;
  }
};

const LinkTabContent: ILinkTab['content'] = ({ state, dispatch }) => {
  const {
    objectType,
    objectId,
    isDirty,
    isEmbedded,
    shareableUrl,
    shareableUrlForSavedObject,
    urlService,
    shareableUrlLocatorParams,
  } = useShareTabsContext()!;

  const setDashboardLink = useCallback(
    (url: string) => {
      dispatch({ type: LINK_TAB_ACTIONS.SET_DASHBOARD_URL, payload: url });
    },
    [dispatch]
  );

  const setIsNotSaved = useCallback(() => {
    dispatch({
      type: LINK_TAB_ACTIONS.SET_IS_NOT_SAVED,
      payload: objectType === 'lens' ? isDirty : false,
    });
  }, [dispatch, objectType, isDirty]);

  return (
    <LinkContent
      {...{
        objectType,
        objectId,
        isDirty,
        isEmbedded,
        shareableUrl,
        shareableUrlForSavedObject,
        urlService,
        shareableUrlLocatorParams,
        dashboardLink: state.dashboardUrl,
        isNotSaved: state.isNotSaved,
        setDashboardLink,
        setIsNotSaved,
      }}
    />
  );
};

export const linkTab: ILinkTab = {
  id: 'link',
  name: i18n.translate('share.contextMenu.permalinksTab', {
    defaultMessage: 'Links',
  }),
  description: i18n.translate('share.dashboard.link.description', {
    defaultMessage: 'Share a direct link to this search.',
  }),
  content: LinkTabContent,
  reducer: linkTabReducer,
  modalActionBtn: {
    id: 'link',
    dataTestSubj: 'copyShareUrlButton',
    label: i18n.translate('share.link.copyLinkButton', { defaultMessage: 'Copy link' }),
    handler: ({ state }) => {
      copyToClipboard(state.dashboardUrl);
    },
    style: ({ state }) => state.isNotSaved,
  },
};
