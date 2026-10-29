/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';

/** One reason a dashboard was rejected before it was saved. */
export type DashboardValidationIssue =
  | {
      /**
       * The state failed the schema. In the default format, this includes a panel config that
       * fails its embeddable schema, reported as a union issue at the panel's path.
       */
      readonly type: 'state';
      readonly issue: z.core.$ZodIssue;
    }
  | {
      /**
       * A panel or pinned panel could not be transformed for saving. In the Dashboard app format,
       * this includes a panel config that fails its embeddable schema.
       */
      readonly type: 'panel';
      readonly panelType: string;
      readonly message: string;
    }
  | {
      /** The ID of a dashboard that does not exist yet is not a valid "as code" ID. */
      readonly type: 'id';
      readonly issue: z.core.$ZodIssue;
    };

/** Thrown by the dashboard server client when the dashboard is invalid; nothing was saved. */
export class DashboardValidationError extends Error {
  public readonly issues: readonly DashboardValidationIssue[];

  constructor(issues: readonly DashboardValidationIssue[]) {
    super('The dashboard is invalid');
    this.name = 'DashboardValidationError';
    this.issues = issues;
  }
}
