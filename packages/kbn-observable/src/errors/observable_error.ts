const canStack = (() => {
  const err = new Error();
  return !!err.stack;
})();

export class ObservableError extends Error {
  constructor(readonly code: string, message: string, constructor?: Function) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, constructor || ObservableError);
    } else if (canStack) {
      this.stack = new Error().stack;
    } else {
      this.stack = '';
    }
  }
}
