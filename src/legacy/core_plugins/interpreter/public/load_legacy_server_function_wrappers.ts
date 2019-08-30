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
import { npSetup } from 'ui/new_platform';
import { ajaxStream } from './lib/ajax_stream';
import { FUNCTIONS_URL } from './lib/consts';
import { batchedFetch } from './lib/batched_fetch';

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

const wrapServerSideFunctions = () => {
  const KIBANA_VERSION = npSetup.core.injectedMetadata.getKibanaVersion();
  const KIBANA_BASE_PATH = npSetup.core.injectedMetadata.getBasePath();
  npSetup.core.http
    .get(FUNCTIONS_URL)
    .then(serverFunctionList => {
      const types = npSetup.plugins.data.expressions.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.types.toJS();
      const { serialize } = serializeProvider(types);
      const batch = batchedFetch({
        ajaxStream: ajaxStream(KIBANA_VERSION, KIBANA_BASE_PATH),
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
        npSetup.plugins.data.expressions.registerFunction(fn);
      });

      npSetup.plugins.data.expressions.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.legacyServerSideFnRegistrationResolver();
    })
    // eslint-disable-next-line no-console
    .catch(error => console.error(error));
};

wrapServerSideFunctions();
