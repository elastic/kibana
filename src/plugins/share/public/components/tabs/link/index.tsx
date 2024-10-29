/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
import { useShareTabsContext } from '../../context';
import { LinkContent } from './link_content';

type ILinkTab = IModalTabDeclaration<{
  dashboardUrl: string;
  isNotSaved: boolean;
  setIsClicked: boolean;
}>;

const LINK_TAB_ACTIONS = {
  SET_DASHBOARD_URL: 'SET_DASHBOARD_URL',
  SET_IS_NOT_SAVED: 'SET_IS_NOT_SAVED',
};

const linkTabReducer: ILinkTab['reducer'] = (
  state = {
    dashboardUrl: '',
    isNotSaved: false,
    setIsClicked: false,
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
    shareableUrl,
    urlService,
    shareableUrlLocatorParams,
    allowShortUrl,
    delegatedShareUrlHandler,
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
      payload:
        objectType === 'lens' || (objectType === 'dashboard' && !allowShortUrl) ? isDirty : false,
    });
  }, [dispatch, objectType, isDirty, allowShortUrl]);

  const setIsClicked = useCallback(() => {
    dispatch({
      type: LINK_TAB_ACTIONS.SET_IS_NOT_SAVED,
      payload: setIsClicked,
    });
  }, [dispatch]);

  return (
    <LinkContent
      {...{
        objectType,
        objectId,
        isDirty,
        shareableUrl,
        urlService,
        shareableUrlLocatorParams,
        dashboardLink: state?.dashboardUrl,
        setDashboardLink,
        isNotSaved: state?.isNotSaved,
        setIsNotSaved,
        allowShortUrl,
        setIsClicked: state?.setIsClicked,
        delegatedShareUrlHandler,
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
};
