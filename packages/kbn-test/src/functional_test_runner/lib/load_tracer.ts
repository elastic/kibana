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

const globalLoadPath: Array<{ ident: string; description: string }> = [];

function getPath(startAt = 0) {
  return globalLoadPath
    .slice(startAt)
    .map((step) => step.description)
    .join(' -> ');
}

const errorsFromLoadTracer = new WeakSet();

function addPathToMessage(message: string, startAt?: number) {
  const path = getPath(startAt);

  if (!path) {
    return message;
  }

  return `${message} -- from ${path}`;
}

/**
 *  Trace the path followed as dependencies are loaded and
 *  check for circular dependencies at each step
 *
 *  @param  {Any} ident identity of this load step, === compared
 *                         to identities of previous steps to find circles
 *  @param  {String} description description of this step
 *  @param  {Function} load function that executes this step
 *  @return {Any} the value produced by load()
 */
export function loadTracer(ident: any, description: string, load: () => Promise<void> | void) {
  const isCircular = globalLoadPath.find((step) => step.ident === ident);
  if (isCircular) {
    throw new Error(addPathToMessage(`Circular reference to "${description}"`));
  }

  try {
    globalLoadPath.unshift({ ident, description });
    return load();
  } catch (err) {
    if (errorsFromLoadTracer.has(err)) {
      throw err;
    }

    const wrapped = new Error(addPathToMessage(`Failure to load ${description}`, 1));
    wrapped.stack = `${wrapped.message}\n\n  Original Error: ${err.stack}`;
    errorsFromLoadTracer.add(wrapped);
    throw wrapped;
  } finally {
    globalLoadPath.shift();
  }
}
