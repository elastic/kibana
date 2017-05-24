export function createLoadingTracker(PromiseCtor) {
  let loadingCount = 0;

  class LoadingTracker {
    run(fn) {
      loadingCount += 1;
      return PromiseCtor.try(fn).finally(() => {
        loadingCount -= 1;
      });
    }

    wrap(fn) {
      const self = this;
      return function (...args) {
        return self.run(() => fn.apply(this, args));
      };
    }

    forceLoading() {
      loadingCount = Infinity;
    }

    isLoading() {
      return loadingCount > 0;
    }
  }

  return new LoadingTracker();
}
