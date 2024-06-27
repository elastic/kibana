/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import useObservable from 'react-use/lib/useObservable';
import { useAirdrop } from './services';

export const useOnDrop = <T extends Record<string, unknown>>({ id }: { id: string }) => {
  const { getAirdrop$For } = useAirdrop();
  const airdrop$ = getAirdrop$For<T>(id);
  const airdrop = useObservable(airdrop$);
  return airdrop;
};
