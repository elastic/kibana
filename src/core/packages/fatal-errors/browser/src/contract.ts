/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { FatalError } from './fatal_error';

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
  add(error: string | Error, source?: string): never;

  /**
   * Register custom error handler for specific error type.
   * @param condition - A function that checks if the error is of a specific type.
   * @param handler
   */
  catch<T extends string | Error>(
    condition: (error: FatalError) => error is FatalError<T>,
    handler: (errors: Array<FatalError<T>>) => ReactNode
  ): void;

  /**
   * Register custom error handler for specific error type.
   * @param condition - A function that checks if the error is of a specific type.
   * @param handler
   */
  catch(
    condition: (error: FatalError) => boolean,
    handler: (errors: FatalError[]) => ReactNode
  ): void;
}

/**
 * FatalErrors stop the Kibana Public Core and displays a fatal error screen
 * with details about the Kibana build and the error.
 *
 * @public
 */
export type FatalErrorsStart = FatalErrorsSetup;
