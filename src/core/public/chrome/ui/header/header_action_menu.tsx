/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FC, useRef, useLayoutEffect, useState } from 'react';
import { Observable } from 'rxjs';
import { MountPoint, UnmountCallback } from '../../../types';

interface HeaderActionMenuProps {
  actionMenu$: Observable<MountPoint | undefined>;
}

export const HeaderActionMenu: FC<HeaderActionMenuProps> = ({ actionMenu$ }) => {
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

  const elementRef = useRef<HTMLDivElement>(null);
  const unmountRef = useRef<UnmountCallback | null>(null);

  useLayoutEffect(() => {
    if (unmountRef.current) {
      unmountRef.current();
      unmountRef.current = null;
    }

    if (mounter.mount && elementRef.current) {
      try {
        unmountRef.current = mounter.mount(elementRef.current);
      } catch (e) {
        // TODO: use client-side logger when feature is implemented
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  }, [mounter]);

  return <div data-test-subj="headerAppActionMenu" ref={elementRef} />;
};
