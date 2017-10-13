export class EmptyError extends Error {
  code = 'K$_EMPTY_ERROR';

  constructor(producer: string) {
    super(
      `EmptyError: ${producer} requires source stream to emit at least one value.`
    );
    Error.captureStackTrace(this, EmptyError);
  }
}
