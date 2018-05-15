import { SchemaError } from '.';

export class SchemaTypeError extends SchemaError {
  constructor(error: Error | string, key?: string) {
    super(SchemaTypeError.extractMessage(error, key), SchemaTypeError.extractCause(error));
  }

  static extractMessage(error: Error | string, context?: string) {
    const message = typeof error === 'string' ? error : error.message;
    if (context == null) {
      return message;
    }
    return `[${context}]: ${message}`;
  }

  static extractCause(error: Error | string): Error | undefined {
    return typeof error !== 'string' ? error : undefined;
  }
}
