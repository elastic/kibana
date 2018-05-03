export class ObservableError extends Error {
  constructor(readonly code: string, message: string, constructor?: Function) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, constructor || ObservableError);
    } else {
      this.stack = new Error().stack || '';
    }
  }
}
