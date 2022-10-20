/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isPromise } from 'util/types';
import { pprof } from './require_pprof';
import { Profile } from './types';

export function withCpuProfile<T>(callback: () => T, onProfileDone: (profile: Profile) => void): T;

export function withCpuProfile(callback: () => any, onProfileDone: (profile: Profile) => void) {
  const stop = pprof.time.start();

  const result = callback();

  function collectProfile() {
    const profile = stop();
    onProfileDone(profile);
  }

  if (isPromise(result)) {
    result.finally(() => {
      collectProfile();
    });
  } else {
    collectProfile();
  }
  return result;
}
