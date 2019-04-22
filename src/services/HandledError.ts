export class HandledError extends Error {
  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, HandledError);
    this.name = 'HandledError';
  }
}
