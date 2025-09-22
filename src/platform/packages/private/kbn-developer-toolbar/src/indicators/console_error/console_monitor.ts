/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, distinctUntilChanged, debounceTime } from 'rxjs';

export class ConsoleMonitor {
  /**
   * List of error messages to ignore.
   * @private
   */
  private IGNORE_ERRORS = [
    // We're ignoring this error until we migrate to React 18's createRoot API.
    'Warning: ReactDOM.render is no longer supported in React 18. Use createRoot instead.',
  ];

  private errorSubject: Subject<{ message: string; type: 'error' | 'warn' } | null> = new Subject<{
    message: string;
    type: 'error' | 'warn';
  } | null>();

  error$ = this.errorSubject.asObservable().pipe(
    distinctUntilChanged(
      (prev, curr) => prev?.message === curr?.message && prev?.type === curr?.type
    ),
    debounceTime(100)
  );

  private originalMethods = {
    // eslint-disable-next-line no-console
    error: console.error.bind(console),
    // eslint-disable-next-line no-console
    warn: console.warn.bind(console),
  };

  private inFlight = false;

  dismiss() {
    this.errorSubject.next(null);
  }

  private createStackFromCaller(wrapperFn: Function): Error {
    const err = new Error();
    // V8/Chromium: start stack from *caller of* wrapperFn (skips wrapper)
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(err, wrapperFn);
    }
    return err;
  }

  init() {
    const createConsoleInterceptor = (method: 'error' | 'warn') => {
      const original = this.originalMethods[method];

      // Use a named function so we can pass it to captureStackTrace
      const intercept = (...args: unknown[]) => {
        // Avoid infinite loops if showError logs again
        if (this.inFlight) return original(...args);
        this.inFlight = true;

        try {
          // 1) Handle our side-effects/telemetry
          try {
            this.showError({ message: this.formatError(...args), type: method });
          } catch {
            // Ignore errors in our own handling
          }

          // 2) Preserve useful stack in DevTools
          // If the caller already passed an Error, keep it
          const hasError = args.some((a) => a instanceof Error);

          if (hasError) {
            // Just forward as-is (best fidelity)
            return original(...args);
          } else {
            // Inject an Error whose stack starts at the *original caller*
            const callerStack = this.createStackFromCaller(intercept);
            return original(...args, callerStack);
          }
        } finally {
          this.inFlight = false;
        }
      };

      return intercept;
    };

    // Override console methods
    // eslint-disable-next-line no-console
    console.error = createConsoleInterceptor('error');
    // eslint-disable-next-line no-console
    console.warn = createConsoleInterceptor('warn');

    // Global error handler for unhandled errors (including React errors)
    const handleGlobalError = (event: ErrorEvent) => {
      this.showError({
        message: event.error?.message || event.message || 'Unknown error',
        type: 'error',
      });
    };

    // Global unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      this.showError({
        message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
        type: 'error',
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      // Restore original console methods
      // eslint-disable-next-line no-console
      console.error = this.originalMethods.error;
      // eslint-disable-next-line no-console
      console.warn = this.originalMethods.warn;

      // Remove global error handlers
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }

  private showError(error: { message: string; type: 'error' | 'warn' }) {
    if (this.IGNORE_ERRORS.some((ignore) => error.message.includes(ignore))) return;

    this.errorSubject.next(error);
  }

  private formatError(...args: unknown[]): string {
    if (args.length === 0) {
      return 'Unknown error';
    }

    const template = args[0];

    // Handle non-string templates (objects, errors, etc.)
    if (typeof template !== 'string') {
      return args.map(this.stringifyArg).join(' ');
    }

    // Handle string templates with %s placeholders
    const values = args.slice(1);
    let result = template;
    let valueIndex = 0;

    // Replace %s placeholders with formatted values
    result = result.replace(/%s/g, () => {
      if (valueIndex < values.length) {
        return this.stringifyArg(values[valueIndex++]);
      }
      return '%s'; // Keep unreplaced placeholders
    });

    // Append any remaining values that weren't used in placeholders
    const remainingValues = values.slice(valueIndex);
    if (remainingValues.length > 0) {
      result += ' ' + remainingValues.map(this.stringifyArg).join(' ');
    }

    return result;
  }

  private stringifyArg(arg: unknown): string {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);

    // Handle Error objects
    if (arg instanceof Error) {
      return arg.message || arg.name || 'Error';
    }

    // Handle React elements and complex objects
    if (typeof arg === 'object') {
      try {
        // For React elements, try to extract component name
        if (arg && typeof arg === 'object' && 'type' in arg) {
          const reactElement = arg as { type?: { name?: string; displayName?: string } };
          if (reactElement.type?.name || reactElement.type?.displayName) {
            return `<${reactElement.type.name || reactElement.type.displayName}>`;
          }
        }

        // For other objects, use JSON with fallback
        const json = JSON.stringify(arg);
        return json.length > 100 ? `${json.substring(0, 100)}...` : json;
      } catch {
        return '[Object]';
      }
    }

    return String(arg);
  }
}
