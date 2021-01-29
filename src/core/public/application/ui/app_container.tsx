/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, {
  Fragment,
  FunctionComponent,
  useLayoutEffect,
  useRef,
  useState,
  MutableRefObject,
} from 'react';
import { EuiLoadingElastic } from '@elastic/eui';

import type { MountPoint } from '../../types';
import { AppLeaveHandler, AppStatus, AppUnmount, Mounter } from '../types';
import { AppNotFound } from './app_not_found_screen';
import { ScopedHistory } from '../scoped_history';
import './app_container.scss';

interface Props {
  /** Path application is mounted on without the global basePath */
  appPath: string;
  appId: string;
  mounter?: Mounter;
  appStatus: AppStatus;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
  setAppActionMenu: (appId: string, mount: MountPoint | undefined) => void;
  createScopedHistory: (appUrl: string) => ScopedHistory;
  setIsMounting: (isMounting: boolean) => void;
}

export const AppContainer: FunctionComponent<Props> = ({
  mounter,
  appId,
  appPath,
  setAppLeaveHandler,
  setAppActionMenu,
  createScopedHistory,
  appStatus,
  setIsMounting,
}: Props) => {
  const [showSpinner, setShowSpinner] = useState(true);
  const [appNotFound, setAppNotFound] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef: MutableRefObject<AppUnmount | null> = useRef<AppUnmount>(null);

  useLayoutEffect(() => {
    const unmount = () => {
      if (unmountRef.current) {
        unmountRef.current();
        unmountRef.current = null;
      }
    };

    if (!mounter || appStatus !== AppStatus.accessible) {
      return setAppNotFound(true);
    }
    setAppNotFound(false);

    setIsMounting(true);
    if (mounter.unmountBeforeMounting) {
      unmount();
    }

    const mount = async () => {
      setShowSpinner(true);
      try {
        unmountRef.current =
          (await mounter.mount({
            appBasePath: mounter.appBasePath,
            history: createScopedHistory(appPath),
            element: elementRef.current!,
            onAppLeave: (handler) => setAppLeaveHandler(appId, handler),
            setHeaderActionMenu: (menuMount) => setAppActionMenu(appId, menuMount),
          })) || null;
      } catch (e) {
        // TODO: add error UI
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        if (elementRef.current) {
          setShowSpinner(false);
          setIsMounting(false);
        }
      }
    };

    mount();

    return unmount;
  }, [
    appId,
    appStatus,
    mounter,
    createScopedHistory,
    setAppLeaveHandler,
    setAppActionMenu,
    appPath,
    setIsMounting,
  ]);

  return (
    <Fragment>
      {appNotFound && <AppNotFound />}
      {showSpinner && (
        <div className="appContainer__loading">
          <EuiLoadingElastic aria-label="Loading application" size="xxl" />
        </div>
      )}
      <div key={appId} ref={elementRef} />
    </Fragment>
  );
};
