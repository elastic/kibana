/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { METRIC_TYPE } from '@kbn/analytics';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { useInternalStateSelector } from '../../state_management/redux';
import {
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../state_management/redux';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import { DiscoverLayout } from '../layout';
import { addHelpMenuToAppChrome } from '../../../../components/help_menu/help_menu_util';
import {
  getDiscoverHeaderAppActionsConfig,
  ShareModal,
} from '../../../../components/header_app_actions/header_app_actions_config';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useSavedSearchAliasMatchRedirect } from '../../../../hooks/saved_search_alias_match_redirect';
import { useAdHocDataViews } from '../../hooks/use_adhoc_data_views';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

const DiscoverLayoutMemoized = React.memo(DiscoverLayout);

export interface DiscoverMainProps {
  /**
   * Central state container
   */
  stateContainer: DiscoverStateContainer;
}

export function DiscoverMainApp({ stateContainer }: DiscoverMainProps) {
  const services = useDiscoverServices();
  const discoverSession = useInternalStateSelector((state) => state.persistedDiscoverSession);
  const { chrome, docLinks, spaces, history } = services;

  /**
   * Adhoc data views functionality
   */
  useAdHocDataViews();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const openShareModal = useCallback(() => setIsShareModalOpen(true), []);
  const closeShareModal = useCallback(() => setIsShareModalOpen(false), []);

  const dispatch = useInternalStateDispatch();
  const dataView = useCurrentDataView();
  const isEsqlMode = useIsEsqlMode();
  const transitionFromDataViewToESQL = useCurrentTabAction(
    internalStateActions.transitionFromDataViewToESQL
  );

  const onEsqlClick = useMemo(() => {
    if (!services.uiSettings.get(ENABLE_ESQL) || isEsqlMode || !dataView) {
      return undefined;
    }
    return () => {
      dispatch(transitionFromDataViewToESQL({ dataView }));
      services.trackUiMetric?.(METRIC_TYPE.CLICK, 'esql:try_btn_clicked');
    };
  }, [dispatch, services, isEsqlMode, dataView, transitionFromDataViewToESQL]);

  // TODO: Move this higher up in the component tree
  useEffect(() => {
    addHelpMenuToAppChrome(chrome, docLinks);
  }, [chrome, docLinks]);

  // POC: Push header app actions (overflow, New, Share, Save, ES|QL) into global header (same pattern as help menu)
  useEffect(() => {
    chrome.setHeaderAppActionsConfig(
      getDiscoverHeaderAppActionsConfig(openShareModal, onEsqlClick)
    );
  }, [chrome, openShareModal, onEsqlClick]);

  // TODO: Move this higher up in the component tree
  useSavedSearchAliasMatchRedirect({ discoverSession, spaces, history });

  return (
    <>
      <ShareModal isOpen={isShareModalOpen} onClose={closeShareModal} />
      <RootDragDropProvider>
        <DiscoverLayoutMemoized stateContainer={stateContainer} />
      </RootDragDropProvider>
    </>
  );
}
