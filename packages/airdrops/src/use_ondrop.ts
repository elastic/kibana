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

export const useOnDrop = <T>({ id }: { id: string }) => {
  const { getAirdrop$ForId } = useAirdrop();
  const airdrop$ = useMemo(() => getAirdrop$ForId<T>(id), [getAirdrop$ForId, id]);
  const airdrop = useObservable(airdrop$);
  return airdrop;
};
