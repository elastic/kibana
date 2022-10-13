/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Observable } from 'rxjs';
import type { FatalErrorInfo } from './get_error_info';
/**
 * FatalErrors stop the Kibana Public Core and displays a fatal error screen
 * with details about the Kibana build and the error.
 *
 * @public
 */
export interface FatalErrorsSetup {
  /**
   * Add a new fatal error. This will stop the Kibana Public Core and display
   * a fatal error screen with details about the Kibana build and the error.
   *
   * @param error - The error to display
   * @param source - Adds a prefix of the form `${source}: ` to the error message
   */
  add: (error: string | Error, source?: string) => never;

  /**
   * An Observable that will emit whenever a fatal error is added with `add()`
   */
  get$: () => Observable<FatalErrorInfo>;
}

/**
 * FatalErrors stop the Kibana Public Core and displays a fatal error screen
 * with details about the Kibana build and the error.
 *
 * @public
 */
export type FatalErrorsStart = FatalErrorsSetup;
