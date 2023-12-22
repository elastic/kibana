/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useEffect, useContext, useRef, useState } from 'react';
import { createEndpoint, fromIframe } from '@remote-ui/rpc';
import { makeStatefulSubscribable, RemoteSubscribable } from '@remote-ui/async-subscription';

type RemoteSubscribableMap<T> = {
  [Prop in keyof T]: RemoteSubscribable<T[Prop]>;
};

interface CloudAPI {
  version: string;
  people: Record<string, unknown>;
  films: Record<string, unknown>;
  info: Record<string, unknown>;
}

interface CloudAPIEndpoint {
  init(): RemoteSubscribableMap<CloudAPI>;
}

interface CloudAPIBridgeProps {
  /**
   * Path to cloud bridge UI endpoint
   */
  apiSourceUrl: string;
}

const createIframe = (iframeSrc: string) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', iframeSrc);
  document.body.appendChild(iframe);
  return iframe;
};

const CloudUIAPIContext = React.createContext<{
  state: ReturnType<CloudAPIEndpoint['init']> | null;
}>({ state: null });

export const CloudAPIBridge = ({
  children,
  apiSourceUrl,
}: React.PropsWithChildren<CloudAPIBridgeProps>) => {
  const [, setIsInitialized] = useState(false);
  const cloudAPIPayload = useRef<RemoteSubscribableMap<CloudAPI> | null>(null);

  const endpoint = useMemo(() => {
    return createEndpoint<CloudAPIEndpoint>(
      fromIframe(createIframe(apiSourceUrl), { terminate: false })
    );
  }, [apiSourceUrl]);

  useEffect(() => {
    endpoint.call.init().then((value) => {
      cloudAPIPayload.current = value;
      // set initialized value to trigger one time render,
      // so we hold on to a reference of the remote subscribable we received on init
      setIsInitialized(true);
    });
  }, [endpoint]);

  return (
    <CloudUIAPIContext.Provider value={{ state: cloudAPIPayload.current }}>
      {children}
    </CloudUIAPIContext.Provider>
  );
};

export const useCloudAPIContext = () => {
  const { state } = useContext(CloudUIAPIContext);

  return state;
};

export const useRootSubscription = <T extends keyof RemoteSubscribableMap<CloudAPI>>(path: T) => {
  const remoteState = useCloudAPIContext();

  const subscription = useMemo(
    () => (remoteState ? makeStatefulSubscribable(remoteState[path]) : null),
    [path, remoteState]
  );
  const [, setValue] = useState(subscription?.current);

  useEffect(() => {
    if (subscription) {
      const unsubscribe = subscription.subscribe(setValue);

      return () => unsubscribe();
    }
  }, [subscription]);

  return subscription?.current;
};
