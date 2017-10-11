import { KibanaError } from '../Errors';

export class SettingError extends KibanaError {
  constructor(error: Error | string, key?: string) {
    super(
      SettingError.extractMessage(error, key),
      SettingError.extractCause(error)
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

export class SettingsError extends KibanaError {
  constructor(errors: Array<Error>, message: string, key?: string) {
    super(
      SettingsError.extractMessages(errors, message, key),
      SettingsError.extractFirstCause(errors)
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
