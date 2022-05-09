/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import React, { createContext, useContext } from 'react';

import { useRequest } from '../../../public/request';

import { Privileges, Error as CustomError } from '../types';

export interface Authorization {
  isLoading: boolean;
  apiError: CustomError | null;
  privileges: Privileges;
}

const initialValue: Authorization = {
  isLoading: true,
  apiError: null,
  privileges: {
    hasAllPrivileges: true,
    missingPrivileges: {},
  },
};

export const AuthorizationContext = createContext<Authorization>(initialValue);

export const useAuthorizationContext = () => {
  const ctx = useContext(AuthorizationContext);
  if (!ctx) {
    throw new Error('AuthorizationContext can only be used inside of AuthorizationProvider!');
  }
  return ctx;
};

interface Props {
  privilegesEndpoint: string;
  children: React.ReactNode;
  httpClient: HttpSetup;
}

export const AuthorizationProvider = ({ privilegesEndpoint, httpClient, children }: Props) => {
  const {
    isLoading,
    error,
    data: privilegesData,
  } = useRequest<any, CustomError>(httpClient, {
    path: privilegesEndpoint,
    method: 'get',
  });

  const value = {
    isLoading,
    privileges: isLoading ? { hasAllPrivileges: true, missingPrivileges: {} } : privilegesData,
    apiError: error ? error : null,
  } as Authorization;

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
};
