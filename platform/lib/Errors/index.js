// @flow

export class KibanaError extends Error {
  cause: Error | void;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }

  toString(): string {
    return `${this.message}\n${this.stack}`;
  }
}

export class TimeoutError extends KibanaError {
  constructor(message: string) {
    super(message);
  }
}
