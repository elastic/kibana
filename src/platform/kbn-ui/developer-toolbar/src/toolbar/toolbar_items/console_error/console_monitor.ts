/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Monitor } from '../monitor';

export interface ConsoleErrorInfo {
  message: string;
  type: 'error' | 'warn';
}

type ConsoleMethod = 'error' | 'warn';

type ErrorWithCaptureStackTrace = ErrorConstructor & {
  captureStackTrace?: (target: object, constructorOpt?: (...args: unknown[]) => void) => void;
};

// Mirrors the original `reason?.message` lookup: any object with a string `message`, not just Errors.
const getRejectionMessage = (reason: unknown): string | undefined => {
  if (typeof reason !== 'object' || reason === null || !('message' in reason)) {
    return undefined;
  }
  const { message } = reason;
  return typeof message === 'string' ? message : undefined;
};

/**
 * Console monitor - tracks console errors and warnings
 * Note: Unlike other monitors, this can emit null values when errors are dismissed
 */
export class ConsoleMonitor implements Monitor<ConsoleErrorInfo | null> {
  private static readonly IGNORE_ERRORS = [
    // We're ignoring this error until we migrate to React 18's createRoot API.
    // https://github.com/elastic/kibana/issues/199100
    'Warning: ReactDOM.render is no longer supported in React 18. Use createRoot instead.',
    /**
     * React 18 concurrent mode logs a “race-condition” warning on unmount of nested roots.
     * Tests show no real breakage, so we silence it for now.
     * Revisit if the warning ever surfaces as an actual bug.
     */
    'Warning: Attempted to synchronously unmount a root while React was already rendering.',
    /**
     * This is a known Chrome DevTools warning that occurs when a ResizeObserver callback takes too long to execute and there are pending notifications that couldn't be delivered within the loop.
     */
    'ResizeObserver loop completed with undelivered notifications.',
  ] as const;

  private static readonly DEBOUNCE_DELAY = 100 as const; // ms

  private readonly target: Console = globalThis.console;

  // Exact references captured at construction so interception chains to whatever the host installed
  // (e.g. APM RUM wrappers) and restoration puts back the identical functions.
  private readonly originalMethods: Record<ConsoleMethod, Console[ConsoleMethod]> = {
    error: this.target.error,
    warn: this.target.warn,
  };

  private callbacks = new Set<(error: ConsoleErrorInfo | null) => void>();
  private lastError: ConsoleErrorInfo | null = null;
  private debounceTimeout?: ReturnType<typeof setTimeout>;
  private inFlight = false;
  private isMonitoring = false;
  private cleanupHandlers?: () => void;

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof console !== 'undefined';
  }

  dismiss() {
    this.lastError = null;
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = undefined;
    }
    this.notifyCallbacks(null);
  }

  private createStackFromCaller(wrapperFn: (...args: unknown[]) => void): Error {
    const err = new Error();
    // V8/Chromium: start stack from *caller of* wrapperFn (skips wrapper)
    (Error as ErrorWithCaptureStackTrace).captureStackTrace?.(err, wrapperFn);
    return err;
  }

  private createConsoleInterceptor(method: ConsoleMethod) {
    const originalMethod = this.originalMethods[method];
    const original = (...args: unknown[]) => originalMethod.apply(this.target, args);
    // Use a named function so we can pass it to captureStackTrace
    const intercept = (...args: unknown[]) => {
      // Avoid infinite loops if our subscribers log again
      if (this.inFlight) return original(...args);
      this.inFlight = true;
      try {
        // Side-effect: record/emit
        try {
          this.showError({ message: this.formatError(...args), type: method });
        } catch {
          // swallow internal errors
        }

        // Preserve/augment stack in DevTools
        const hasError = args.some((a) => a instanceof Error);
        return hasError
          ? original(...args)
          : original(...args, this.createStackFromCaller(intercept));
      } finally {
        this.inFlight = false;
      }
    };
    return intercept;
  }

  startMonitoring() {
    if (this.isMonitoring || !this.isSupported()) return;

    this.isMonitoring = true;

    const interceptError = this.createConsoleInterceptor('error');
    const interceptWarn = this.createConsoleInterceptor('warn');

    // Override console methods
    this.target.error = interceptError;
    this.target.warn = interceptWarn;

    // Global error handler for unhandled errors (including React errors)
    const handleGlobalError = (event: ErrorEvent) => {
      this.showError({
        message: event.error?.message || event.message || 'Unknown error',
        type: 'error',
      });
    };

    // Global unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      this.showError({
        message: getRejectionMessage(reason) || String(reason) || 'Unhandled promise rejection',
        type: 'error',
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    this.cleanupHandlers = () => {
      // Restore original console methods only if we still own them
      if (this.target.error === interceptError) this.target.error = this.originalMethods.error;
      if (this.target.warn === interceptWarn) this.target.warn = this.originalMethods.warn;

      // Remove global error handlers
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;

    if (this.cleanupHandlers) {
      this.cleanupHandlers();
      this.cleanupHandlers = undefined;
    }
  }

  destroy() {
    this.stopMonitoring();
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = undefined;
    }
    this.callbacks.clear();
    this.lastError = null;
  }

  subscribe(callback: (error: ConsoleErrorInfo | null) => void) {
    this.callbacks.add(callback);
    // Emit current state to the new subscriber
    try {
      callback(this.lastError);
    } catch {
      // isolate subscriber errors
    }
    return () => {
      this.callbacks.delete(callback);
    };
  }

  getLast(): ConsoleErrorInfo | null {
    return this.lastError;
  }

  private showError(error: { message: string; type: 'error' | 'warn' }) {
    if (ConsoleMonitor.IGNORE_ERRORS.some((ignore) => error.message.includes(ignore))) return;

    const isNewError =
      !this.lastError ||
      this.lastError.message !== error.message ||
      this.lastError.type !== error.type;

    if (!isNewError) return;

    this.lastError = error;

    // Debounce burst emissions: schedule once per burst and emit latest
    if (this.debounceTimeout) return;
    this.debounceTimeout = setTimeout(() => {
      this.debounceTimeout = undefined;
      this.notifyCallbacks(this.lastError);
    }, ConsoleMonitor.DEBOUNCE_DELAY);
  }

  private notifyCallbacks(error: ConsoleErrorInfo | null) {
    for (const cb of this.callbacks) {
      try {
        cb(error);
      } catch {
        // isolate subscriber failures
      }
    }
  }

  private formatError(...args: unknown[]): string {
    if (args.length === 0) return 'Unknown error';
    const [template, ...rest] = args;

    if (typeof template !== 'string') {
      return args.map((a) => this.stringifyArg(a)).join(' ');
    }

    // Support common console printf tokens: %s %d/%i %f %o
    let idx = 0;
    const formatted = template.replace(/%[sdifo]/g, (m) => {
      const v = rest[idx++];
      switch (m) {
        case '%s':
          return String(this.stringifyArg(v));
        case '%d':
        case '%i':
          return Number(v).toString();
        case '%f':
          return Number(v).toString();
        case '%o':
          return this.stringifyArg(v);
        default:
          return m;
      }
    });

    const tail = rest.slice(idx).map((a) => this.stringifyArg(a));
    return tail.length ? `${formatted} ${tail.join(' ')}` : formatted;
  }

  private stringifyArg(arg: unknown): string {
    if (arg == null) return String(arg);
    const t = typeof arg;
    if (t === 'string' || t === 'number' || t === 'boolean') return String(arg);

    if (arg instanceof Error) {
      return arg.message || arg.name || 'Error';
    }

    // React elements: show component name if possible
    if (typeof arg === 'object' && 'type' in arg) {
      const comp = (arg as { type?: { displayName?: string; name?: string } }).type;
      const name = comp?.displayName || comp?.name;
      if (name) return `<${name}>`;
    }

    // Safe JSON with circular guard + size cap
    try {
      const seen = new WeakSet<object>();
      const json = JSON.stringify(arg, (_k, v) => {
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v as object)) return '[Circular]';
          seen.add(v as object);
        }
        return v;
      });
      const s = json ?? '[Object]';
      return s.length > 200 ? `${s.slice(0, 200)}…` : s;
    } catch {
      return '[Object]';
    }
  }
}
