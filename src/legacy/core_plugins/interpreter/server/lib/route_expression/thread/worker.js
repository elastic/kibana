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

import uuid from 'uuid/v4';
import { populateServerRegistries } from '@kbn/interpreter/server';
import { interpretProvider, serializeProvider, FunctionsRegistry, TypesRegistry } from '@kbn/interpreter/common';

// We actually DO need populateServerRegistries here since this is a different node process
const registries = {
  commonFunctions: new FunctionsRegistry(),
  types: new TypesRegistry(),
};

const pluginsReady = populateServerRegistries(registries);
const heap = {};

process.on('message', msg => {
  const { type, id, value } = msg;
  const threadId = id;

  pluginsReady.then(({ commonFunctions, types }) => {
    types = types.toJS();
    const { serialize, deserialize } = serializeProvider(types);
    const interpret = interpretProvider({
      types,
      functions: commonFunctions.toJS(),
      handlers: { environment: 'serverThreaded' },
      onFunctionNotFound: (ast, context) => {
        const id = uuid();
        // This needs to send a message to the main thread, and receive a response. Uhg.
        process.send({
          type: 'run',
          threadId,
          id,
          value: {
            ast,
            context: serialize(context),
          },
        });

        // Note that there is no facility to reject here. That's because this would only occur as the result of something that happens in the main thread, and we reject there
        return new Promise(resolve => {
          heap[id] = { resolve };
        });
      },
    });

    if (type === 'getFunctions') {
      process.send({ type: 'functionList', value: Object.keys(commonFunctions.toJS()) });
    }

    if (type === 'msgSuccess') {
      heap[id].resolve(deserialize(value));
      delete heap[id];
    }

    if (type === 'run') {
      const { ast, context } = msg.value;

      interpret(ast, deserialize(context))
        .then(value => {
          process.send({ type: 'msgSuccess', value: serialize(value), id });
        })
        // TODO: I don't think it is even possible to hit this
        .catch(value => {
          process.send({ type: 'msgError', value, id });
        });
    }
  });
});
