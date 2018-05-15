import { SchemaError } from '.';

export class SchemaTypesError extends SchemaError {
  constructor(errors: Array<Error>, message: string, key?: string) {
    super(
      SchemaTypesError.extractMessages(errors, message, key),
      SchemaTypesError.extractFirstCause(errors)
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
