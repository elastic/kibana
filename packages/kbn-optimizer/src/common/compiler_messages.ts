/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Message sent when a compiler encouters an unresolvable error.
 * The worker will be shut down following this message.
 */
export interface CompilerErrorMsg {
  type: 'compiler error';
  id: string;
  errorMsg: string;
  errorStack?: string;
}

/**
 * Message sent when a compiler starts running, either for the first
 * time or because of changes detected when watching.
 */
export interface CompilerRunningMsg {
  type: 'running';
  bundleId: string;
}

/**
 * Message sent when a compiler encounters an error that
 * prevents the bundle from building correctly. When in
 * watch mode these issues can be fixed by the user.
 * (ie. unresolved import, syntax error, etc.)
 */
export interface CompilerIssueMsg {
  type: 'compiler issue';
  bundleId: string;
  failure: string;
}

/**
 * Message sent when a compiler completes successfully and
 * the bundle has been written to disk or updated on disk.
 */
export interface CompilerSuccessMsg {
  type: 'compiler success';
  bundleId: string;
  moduleCount: number;
}

export type CompilerMsg = CompilerRunningMsg | CompilerIssueMsg | CompilerSuccessMsg;

export class CompilerMsgs {
  constructor(private bundle: string) {}

  running(): CompilerRunningMsg {
    return {
      bundleId: this.bundle,
      type: 'running',
    };
  }

  compilerFailure(options: { failure: string }): CompilerIssueMsg {
    return {
      bundleId: this.bundle,
      type: 'compiler issue',
      failure: options.failure,
    };
  }

  compilerSuccess(options: { moduleCount: number }): CompilerSuccessMsg {
    return {
      bundleId: this.bundle,
      type: 'compiler success',
      moduleCount: options.moduleCount,
    };
  }

  error(error: Error): CompilerErrorMsg {
    return {
      id: this.bundle,
      type: 'compiler error',
      errorMsg: error.message,
      errorStack: error.stack,
    };
  }
}
