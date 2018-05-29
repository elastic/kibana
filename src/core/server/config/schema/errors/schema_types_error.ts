import { SchemaError } from '.';

export class SchemaTypesError extends SchemaError {
  public static extractMessages(
    error: Error[],
    heading: string,
    context?: string
  ) {
    const messages = `- ${error.map(e => e.message).join('\n- ')}`;

    if (context == null) {
      return `${heading}:\n${messages}`;
    }
    return `[${context}]: ${heading}:\n${messages}`;
  }

  public static extractFirstCause(error: Error[]): Error | undefined {
    return error.length > 0 ? error[0] : undefined;
  }

  constructor(errors: Error[], message: string, key?: string) {
    super(
      SchemaTypesError.extractMessages(errors, message, key),
      SchemaTypesError.extractFirstCause(errors)
    );
  }
}
