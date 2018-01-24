import { KibanaError } from '../Errors';

export class TypeError extends KibanaError {
  constructor(error: Error | string, key?: string) {
    super(
      TypeError.extractMessage(error, key),
      TypeError.extractCause(error)
    );
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

export class TypesError extends KibanaError {
  constructor(errors: Array<Error>, message: string, key?: string) {
    super(
      TypesError.extractMessages(errors, message, key),
      TypesError.extractFirstCause(errors)
    );
  }

  static extractMessages(
    error: Array<Error>,
    heading: string,
    context?: string
  ) {
    const messages = `- ${error.map(e => e.message).join('\n- ')}`;

    if (context == null) {
      return `${heading}:\n${messages}`;
    }
    return `[${context}]: ${heading}:\n${messages}`;
  }

  static extractFirstCause(error: Array<Error>): Error | undefined {
    return error.length > 0 ? error[0] : undefined;
  }
}
