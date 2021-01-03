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

import * as functionType from './function';
import * as literal from './literal';
import * as namedArg from './named_arg';
import * as wildcard from './wildcard';
import { NodeTypes } from './types';

export { NodeTypes };
export { nodeBuilder } from './node_builder';

export const nodeTypes: NodeTypes = {
  // This requires better typing of the different typings and their return types.
  // @ts-ignore
  function: functionType,
  literal,
  namedArg,
  wildcard,
};
