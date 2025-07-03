/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { debounce } from 'rxjs';
import { timer } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { ApplicationStart, CoreStart, IBasePath } from '@kbn/core/public';
import { ISessionService } from '../../session_service';
import { SearchSessionIndicator } from '.';

export interface SearchSessionIndicatorDeps {
  sessionService: ISessionService;
  application: ApplicationStart;
  basePath: IBasePath;
  storage: IStorageWrapper;
  tourDisabled: boolean;
  coreStart: CoreStart;
  onOpenFlyout?: () => void;
}

export enum SearchSessionState {
  /**
   * Pending search request has not been sent to the background yet
   */
  Loading = 'loading',

  /**
   * No action was taken and the page completed loading without search session creation.
   */
  Completed = 'completed',

  /**
   * Search request was sent to the background.
   * The page is loading in background.
   */
  BackgroundLoading = 'backgroundLoading',

  /**
   * Page load completed with search session created.
   */
  BackgroundCompleted = 'backgroundCompleted',

  /**
   * Revisiting the page after background completion
   */
  Restored = 'restored',

  Canceled = 'canceled',

  None = 'none',
}

export const createConnectedBackgroundSessionButton = ({
  sessionService,
  basePath,
  onOpenFlyout,
}: SearchSessionIndicatorDeps): React.FC => {
  const searchSessionsManagementUrl = basePath.prepend('/app/management/kibana/search_sessions');

  const debouncedSessionServiceState$ = sessionService.state$.pipe(
    debounce((_state) => timer(_state === SearchSessionState.None ? 50 : 300)) // switch to None faster to quickly remove indicator when navigating away
  );

  return () => {
    const state = useObservable(debouncedSessionServiceState$, SearchSessionState.None);
    const isSaveDisabledByApp = sessionService.getSearchSessionIndicatorUiConfig().isDisabled();
    const disableSaveAfterSearchesExpire = useObservable(
      sessionService.disableSaveAfterSearchesExpire$,
      false
    );

    let saveDisabled = false;
    let saveDisabledReasonText: string = '';

    let managementDisabled = false;
    let managementDisabledReasonText: string = '';

    if (disableSaveAfterSearchesExpire) {
      saveDisabled = true;
      saveDisabledReasonText = i18n.translate(
        'data.searchSessionIndicator.disabledDueToTimeoutMessage',
        {
          defaultMessage: 'Search session results expired.',
        }
      );
    }

    if (isSaveDisabledByApp.disabled) {
      saveDisabled = true;
      saveDisabledReasonText = isSaveDisabledByApp.reasonText;
    }

    // check if user doesn't have access to search_sessions and search_sessions mgtm
    // this happens in case there is no app that allows current user to use search session
    if (!sessionService.hasAccess()) {
      managementDisabled = saveDisabled = true;
      managementDisabledReasonText = saveDisabledReasonText = i18n.translate(
        'data.searchSessionIndicator.disabledDueToDisabledGloballyMessage',
        {
          defaultMessage: "You don't have permissions to manage search sessions",
        }
      );
    }

    const {
      name: searchSessionName,
      startTime,
      completedTime,
      canceledTime,
    } = useObservable(sessionService.sessionMeta$, { state, isContinued: false });
    const saveSearchSessionNameFn = useCallback(async (newName: string) => {
      await sessionService.renameCurrentSession(newName);
    }, []);

    if (!sessionService.isSessionStorageReady()) return null;
    return (
      <SearchSessionIndicator
        state={state}
        saveDisabled={saveDisabled}
        saveDisabledReasonText={saveDisabledReasonText}
        managementDisabled={managementDisabled}
        managementDisabledReasonText={managementDisabledReasonText}
        viewSearchSessionsLink={searchSessionsManagementUrl}
        searchSessionName={searchSessionName}
        saveSearchSessionNameFn={saveSearchSessionNameFn}
        startedTime={startTime}
        completedTime={completedTime}
        canceledTime={canceledTime}
        onOpenMangementFlyout={onOpenFlyout}
      />
    );
  };
};
