/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useLayoutEffect, useState } from 'react';
import { AppMenuBar } from '@kbn/core-chrome-browser-internal/src/ui/project/app_menu';
import { Observable } from 'rxjs';
import { MountPoint } from '@kbn/core-mount-utils-browser';

export interface KibanaActionMenuMountProps {
  currentActionMenu$: Observable<MountPoint | undefined>;
}

export const KibanaActionMenuMount = ({ currentActionMenu$ }: KibanaActionMenuMountProps) => {
  const mounter = useHeaderActionMenuMounter(currentActionMenu$);
  return mounter.mount ? <AppMenuBar headerActionMenuMounter={mounter} /> : <></>;
};

const useHeaderActionMenuMounter = (actionMenu$: Observable<MountPoint | undefined>) => {
  // useObservable relies on useState under the hood. The signature is type SetStateAction<S> = S | ((prevState: S) => S);
  // As we got a Observable<Function> here, React's setState setter assume he's getting a `(prevState: S) => S` signature,
  // therefore executing the mount method, causing everything to crash.
  // piping the observable before calling `useObservable` causes the effect to always having a new reference, as
  // the piped observable is a new instance on every render, causing infinite loops.
  // this is why we use `useLayoutEffect` manually here.
  const [mounter, setMounter] = useState<{ mount: MountPoint | undefined }>({ mount: undefined });
  useLayoutEffect(() => {
    const s = actionMenu$.subscribe((value) => {
      setMounter({ mount: value });
    });
    return () => s.unsubscribe();
  }, [actionMenu$]);

  return mounter;
};
