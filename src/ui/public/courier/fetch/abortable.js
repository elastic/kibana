import { ReqStatusProvider } from './req_status';

export function AbortableProvider(Private) {
  const { ABORTED } = Private(ReqStatusProvider);

  return function createAbortable(steps) {
    let aborted = false;
    return {
      promise: steps.reduce(
        (acc, step) => acc.then(val => {
          if (aborted) throw ABORTED;
          return step(val);
        }),
        Promise.resolve()
      ),
      abort() {
        aborted = true;
      }
    };
  };
}
