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

import { interpreterProvider } from '../common/interpreter/interpret';
import { serializeProvider } from '../common/lib/serialize';
import { createHandlers } from './create_handlers';
import { batchedFetch } from './batched_fetch';
import { FUNCTIONS_URL } from './consts';

export async function initializeInterpreter(kfetch, typesRegistry, functionsRegistry) {
  const serverFunctionList = await kfetch({ pathname: FUNCTIONS_URL });
  const types = typesRegistry.toJS();
  const { serialize } = serializeProvider(types);
  const batch = batchedFetch({ kfetch, serialize });

  // For every sever-side function, register a client-side
  // function that matches its definition, but which simply
  // calls the server-side function endpoint.
  Object.keys(serverFunctionList).forEach(functionName => {
    functionsRegistry.register(() => ({
      ...serverFunctionList[functionName],
      fn: (context, args) => batch({ functionName, args, context }),
    }));
  });

  const interpretAst = async (ast, context, handlers) => {
    const interpretFn = await interpreterProvider({
      types: typesRegistry.toJS(),
      handlers: { ...handlers, ...createHandlers() },
      functions: functionsRegistry.toJS(),
    });
    return interpretFn(ast, context);
  };

  return { interpretAst };
}

