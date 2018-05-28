export class SchemaError extends Error {
  public cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, SchemaError.prototype);
  }
}
