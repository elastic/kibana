// TODO https://github.com/sindresorhus/clean-stack for cleaner stack
export class KibanaError extends Error {
  // `cause` lets us chain errors, e.g. so we can wrap underlying errors and
  // get a "full" stack trace that includes the causes.
  // TODO Handle stacks from `cause`, see e.g.
  // - https://github.com/joyent/node-verror
  // - https://github.com/bluejamesbond/TraceError.js
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;

    // Set the prototype explicitly, see https://goo.gl/bTnzz2
    Object.setPrototypeOf(this, KibanaError.prototype);
  }
}
