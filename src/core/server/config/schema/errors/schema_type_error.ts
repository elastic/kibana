import { SchemaError } from '.';

export class SchemaTypeError extends SchemaError {
  public static extractMessage(error: Error | string, context?: string) {
    const message = typeof error === 'string' ? error : error.message;
    if (context == null) {
      return message;
    }
    return `[${context}]: ${message}`;
  }

  public static extractCause(error: Error | string): Error | undefined {
    return typeof error !== 'string' ? error : undefined;
  }

  constructor(error: Error | string, key?: string) {
    super(
      SchemaTypeError.extractMessage(error, key),
      SchemaTypeError.extractCause(error)
    );
  }
}
