/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { matchPath } from 'react-router-dom';
import { DISCOVER_DEFAULT_PROFILE_ID } from './consts';

export const addProfile = (path: string, profile: string) => {
  if (profile === DISCOVER_DEFAULT_PROFILE_ID) {
    return path;
  }

  const trimmedPath = path.trim();
  const hasSlash = trimmedPath.endsWith('/');

  return `${trimmedPath}${hasSlash ? '' : '/'}p/${profile}${hasSlash ? '/' : ''}`;
};

export const getProfile = (path: string) => {
  const profileMatch = matchPath<{ profile?: string }>(path, {
    path: '/p/:profile',
  });

  let profile: string;
  let isProfileRootPath: boolean;

  if (
    profileMatch &&
    profileMatch.params.profile &&
    profileMatch.params.profile !== DISCOVER_DEFAULT_PROFILE_ID
  ) {
    profile = profileMatch.params.profile;
    isProfileRootPath = profileMatch.isExact;
  } else {
    const rootMatch = matchPath(path, { path: '/' });
    profile = DISCOVER_DEFAULT_PROFILE_ID;
    isProfileRootPath = rootMatch?.isExact ?? false;
  }

  return { profile, isProfileRootPath };
};
