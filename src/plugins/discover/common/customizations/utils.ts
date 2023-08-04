/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { matchPath } from 'react-router-dom';

export const addProfile = (path: string, profile: string) => {
  const trimmedPath = path.trim();
  const hasSlash = trimmedPath.endsWith('/');

  return `${trimmedPath}${hasSlash ? '' : '/'}p/${profile}${hasSlash ? '/' : ''}`;
};

export const getProfile = (path: string) => {
  const match = matchPath<{ profile?: string }>(path, {
    path: '/p/:profile',
  });

  return {
    profile: match?.params.profile,
    isProfileRootPath: match?.isExact ?? false,
  };
};
