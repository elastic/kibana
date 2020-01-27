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

/**
 * This file needs to be deleted by 8.0 release. It is here to load available
 * server side functions and create a wrappers around them on client side, to
 * execute them from client side. This functionality is used only by Canvas
 * and all server side functions are in Canvas plugin.
 *
 * In 8.0 there will be no server-side functions, plugins will register only
 * client side functions and if they need those to execute something on the
 * server side, it should be respective function's internal implementation detail.
 */

import { get, identity } from 'lodash';
// @ts-ignore
import { npSetup, npStart } from 'ui/new_platform';
import { FUNCTIONS_URL } from './consts';
import { batchedFetch } from './batched_fetch';

export function getType(node: any) {
  if (node == null) return 'null';
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type property');
    return node.type;
  }
  return typeof node;
}

export function serializeProvider(types: any) {
  return {
    serialize: provider('serialize'),
    deserialize: provider('deserialize'),
  };

  function provider(key: any) {
    return (context: any) => {
      const type = getType(context);
      const typeDef = types[type];
      const fn: any = get(typeDef, key) || identity;
      return fn(context);
    };
  }
}

let cached: Promise<void> | null = null;

export const loadLegacyServerFunctionWrappers = async () => {
  if (!cached) {
    cached = (async () => {
      const serverFunctionList = await npSetup.core.http.get(FUNCTIONS_URL);
      const types = npSetup.plugins.expressions.__LEGACY.types.toJS();
      const { serialize } = serializeProvider(types);
      const batch = batchedFetch({
        fetchStreaming: npStart.plugins.bfetch.fetchStreaming,
        serialize,
      });

      // For every sever-side function, register a client-side
      // function that matches its definition, but which simply
      // calls the server-side function endpoint.
      Object.keys(serverFunctionList).forEach(functionName => {
        const fn = () => ({
          ...serverFunctionList[functionName],
          fn: (context: any, args: any) => batch({ functionName, args, context }),
        });
        npSetup.plugins.expressions.registerFunction(fn);
      });
    })();
  }

  return cached;
};
