export const log = {
  /**
   * Log something to the console. Ideally we would use a real logger in
   * kbn-pm, but that's a pretty big change for now.
   * @param  ...args
   */
  write(...args: any[]) {
    // tslint:disable no-console
    console.log(...args);
  },
};
