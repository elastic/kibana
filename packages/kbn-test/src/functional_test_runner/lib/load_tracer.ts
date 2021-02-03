/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
