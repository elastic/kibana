/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const reactQuery = require('@tanstack/react-query');
// const queryCore = require('@tanstack/query-core');

// const useQuery = (arg1, arg2, arg3) => {
//   const parsedOptions = queryCore.parseQueryArgs(arg1, arg2, arg3);
//   return reactQuery.useQuery({
//     networkMode: 'always',
//     ...parsedOptions,
//   });
// };

// const useMutation = (arg1, arg2, arg3) => {
//   const parsedOptions = queryCore.parseMutationArgs(arg1, arg2, arg3);
//   return reactQuery.useMutation({
//     networkMode: 'always',
//     ...parsedOptions,
//   });
// };

class QueryClient extends reactQuery.QueryClient {
  constructor(config = {}) {
    super({
      ...config,
      defaultOptions: {
        ...config.defaultOptions,
        queries: {
          networkMode: 'always',
          ...config.defaultOptions?.queries,
        },
        mutations: {
          networkMode: 'always',
          ...config.defaultOptions?.mutations,
        },
      },
    });
  }
}

module.exports = {
  ...reactQuery,
  // useQuery,
  // useMutation,
  QueryClient,
};
