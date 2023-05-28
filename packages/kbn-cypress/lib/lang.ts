import bluebird from "bluebird";

bluebird.Promise.config({
  cancellation: true,
});
export const BPromise = bluebird.Promise;

export const safe =
  <T extends any[], R extends any>(
    fn: (...args: T) => Promise<R>,
    ifFaled: (e: unknown) => any,
    ifSucceed: () => any
  ) =>
  async (...args: T) => {
    try {
      const r = await fn(...args);
      ifSucceed();
      return r;
    } catch (e) {
      ifFaled(e);
    }
  };
