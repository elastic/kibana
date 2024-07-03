/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useAirdrop } from './services';

export const useOnDrop = <T>({ id, group }: { id?: string; group?: string }) => {
  const { getAirdrop$ForId, getAirdrop$ForGroup } = useAirdrop();

  const airdrop$ = useMemo(() => {
    if (id) {
      return getAirdrop$ForId<T>(id);
    } else if (group) {
      return getAirdrop$ForGroup<T>(group);
    }
    throw new Error('Either id or group must be provided');
  }, [getAirdrop$ForId, getAirdrop$ForGroup, group, id]);

  const airdrop = useObservable(airdrop$);
  return airdrop;
};
