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

import { AppUnmount, Mounter, AppLeaveHandler } from '../types';
import { AppNotFound } from './app_not_found_screen';

interface Props {
  appId: string;
  mounter?: Mounter;
  setAppLeaveHandler: (appId: string, handler: AppLeaveHandler) => void;
}

export const AppContainer: FunctionComponent<Props> = ({
  mounter,
  appId,
  setAppLeaveHandler,
}: Props) => {
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
    const mount = async () => {
      if (!mounter) {
        return setAppNotFound(true);
      }

      if (mounter.unmountBeforeMounting) {
        unmount();
      }

      unmountRef.current =
        (await mounter.mount({
          appBasePath: mounter.appBasePath,
          element: elementRef.current!,
          onAppLeave: handler => setAppLeaveHandler(appId, handler),
        })) || null;
      setAppNotFound(false);
    };

    mount();
    return unmount;
  }, [appId, mounter, setAppLeaveHandler]);

  return (
    <Fragment>
      {appNotFound && <AppNotFound />}
      <div key={appId} ref={elementRef} />
    </Fragment>
  );
};
