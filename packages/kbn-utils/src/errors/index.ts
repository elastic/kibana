export class KibanaError extends Error {
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;

    // Set the prototype explicitly, see https://goo.gl/bTnzz2
    Object.setPrototypeOf(this, KibanaError.prototype);
  }
}
