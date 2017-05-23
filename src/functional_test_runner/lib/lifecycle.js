export function createLifecycle() {
  const listeners = {
    beforeLoadTests: [],
    beforeTests: [],
    beforeEachTest: [],
    testFailure: [],
    testHookFailure: [],
    cleanup: [],
    phaseStart: [],
    phaseEnd: [],
  };

  class Lifecycle {
    on(name, fn) {
      if (!listeners[name]) {
        throw new TypeError(`invalid lifecycle event "${name}"`);
      }

      listeners[name].push(fn);
      return this;
    }

    async trigger(name, ...args) {
      if (!listeners[name]) {
        throw new TypeError(`invalid lifecycle event "${name}"`);
      }

      try {
        if (name !== 'phaseStart' && name !== 'phaseEnd') {
          await this.trigger('phaseStart', name);
        }

        await Promise.all(listeners[name].map(
          async fn => await fn(...args)
        ));
      } finally {
        if (name !== 'phaseStart' && name !== 'phaseEnd') {
          await this.trigger('phaseEnd', name);
        }
      }
    }
  }

  return new Lifecycle();
}
