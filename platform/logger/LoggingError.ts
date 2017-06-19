import { KibanaError } from "../lib/Errors";

export class LoggingError extends KibanaError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}
