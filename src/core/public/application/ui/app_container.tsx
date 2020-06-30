/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, {
  Fragment,
  FunctionComponent,
  useLayoutEffect,
  useRef,
  useState,
  MutableRefObject,
} from 'react';

import { EuiLoadingSpinner } from '@elastic/eui';
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
  createScopedHistory: (appUrl: string) => ScopedHistory;
  setIsMounting: (isMounting: boolean) => void;
}

export const AppContainer: FunctionComponent<Props> = ({
  mounter,
  appId,
  appPath,
  setAppLeaveHandler,
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
          })) || null;
      } catch (e) {
        // TODO: add error UI
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setShowSpinner(false);
        setIsMounting(false);
      }
    };

    mount();

    return unmount;
  }, [appId, appStatus, mounter, createScopedHistory, setAppLeaveHandler, appPath, setIsMounting]);

  return (
    <Fragment>
      {appNotFound && <AppNotFound />}
      {showSpinner && (
        <div className="appContainer__loading">
          <EuiLoadingSpinner size="l" />
        </div>
      )}
      <div key={appId} ref={elementRef} />
    </Fragment>
  );
};
