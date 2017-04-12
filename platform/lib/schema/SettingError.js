// @flow

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
      return `Invalid setting. ${message}`;
    }
    return `Invalid [${context}] setting. ${message}`;
  }

  static extractCause(error: Error | string): Error | void {
    return typeof error !== 'string' ? error : undefined;
  }
}
