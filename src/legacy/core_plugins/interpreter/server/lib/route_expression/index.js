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

import { createError } from '@kbn/interpreter/common';

export const routeExpressionProvider = environments => {
  async function routeExpression(ast, context = null) {
    // List of environments in order of preference

    return Promise.all(environments).then(async environments => {
      const environmentFunctions = await Promise.all(environments.map(env => env.getFunctions()));

      // Grab name of the first function in the chain
      const fnName = ast.chain[0].function.toLowerCase();

      // Check each environment for that function
      for (let i = 0; i < environmentFunctions.length; i++) {
        if (environmentFunctions[i].includes(fnName)) {
          // If we find it, run in that environment, and only that environment
          return environments[i].interpret(ast, context).catch(e => createError(e));
        }
      }

      // If the function isn't found in any environment, give up
      throw new Error(`Function not found: [${fnName}]`);
    });
  }

  return routeExpression;
};
