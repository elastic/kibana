
/**
 * Tracks the individual queue for each kbnServer, rather than attaching
 * it to the kbnServer object via a property or something
 * @type {WeakMap}
 */
const queues = new WeakMap();

export function waitForInitSetupMixin(kbnServer) {
  queues.set(kbnServer, []);

  kbnServer.afterPluginsInit = function (callback) {
    const queue = queues.get(kbnServer);

    if (!queue) {
      throw new Error('Plugins have already initialized. Only use this method for setup logic that must wait for plugins to initialize.');
    }

    queue.push(callback);
  };
}

export async function waitForInitResolveMixin(kbnServer, server, config) {
  const queue = queues.get(kbnServer);
  queues.set(kbnServer, null);

  // only actually call the callbacks if we are really initializing
  if (config.get('plugins.initialize')) {
    for (const cb of queue) {
      await cb();
    }
  }
}
