/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { HttpSetup } from 'kibana/public';
import React, { createContext, useContext } from 'react';

import { useRequest } from '../../../public';

import { Error as CustomError } from './section_error';

import { Privileges } from '../types';

interface Authorization {
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
  const { isLoading, error, data: privilegesData } = useRequest<any, CustomError>(httpClient, {
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
