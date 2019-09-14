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
 * A generic type which represents a custom Expression Type Definition that's
 * registered to the Interpreter.
 */
export interface ExpressionType<Name extends string, Type, SerializedType = undefined> {
  name: Name;
  validate?: (type: any) => void | Error;
  serialize?: (type: Type) => SerializedType;
  deserialize?: (type: SerializedType) => Type;
  // TODO: Update typings for the `availableTypes` parameter once interfaces for this
  // have been added elsewhere in the interpreter.
  from?: Record<string, (ctx: any, availableTypes: Record<string, any>) => Type>;
  to?: Record<string, (type: Type, availableTypes: Record<string, any>) => unknown>;
}
