const globalLoadPath = [];
function getPath(startAt = 0) {
  return globalLoadPath
    .slice(startAt)
    .map(step => step.descrption)
    .join(' -> ');
}

function addPathToMessage(message, startAt) {
  const path = getPath(startAt);
  if (!path) return message;
  return `${message} -- from ${path}`;
}

/**
 *  Trace the path followed as dependencies are loaded and
 *  check for circular dependencies at each step
 *
 *  @param  {Any} ident identity of this load step, === compaired
 *                         to identities of previous steps to find circles
 *  @param  {String} descrption description of this step
 *  @param  {Function} load function that executes this step
 *  @return {Any} the value produced by load()
 */
export function loadTracer(ident, descrption, load) {
  const isCircular = globalLoadPath.find(step => step.ident === ident);
  if (isCircular) {
    throw new Error(addPathToMessage(`Circular reference to "${descrption}"`));
  }

  try {
    globalLoadPath.unshift({ ident, descrption });
    return load();
  } catch (err) {
    if (err.__fromLoadTracer) {
      throw err;
    }

    const wrapped = new Error(addPathToMessage(`Failure to load ${descrption}`, 1));
    wrapped.stack = `${wrapped.message}\n\n  Original Error: ${err.stack}`;
    wrapped.__fromLoadTracer = true;
    throw wrapped;
  } finally {
    globalLoadPath.shift();
  }
}
