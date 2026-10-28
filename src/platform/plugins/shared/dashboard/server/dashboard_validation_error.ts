/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** One reason a dashboard was rejected before it was saved. */
export type DashboardValidationIssue =
  | {
      /** A dashboard state field failed the schema. */
      readonly type: 'state';
      readonly path: ReadonlyArray<PropertyKey>;
      readonly message: string;
    }
  | {
      /** A panel config failed its embeddable schema or could not be transformed. */
      readonly type: 'panel';
      readonly panelType: string;
      readonly message: string;
    }
  | {
      /** The ID of a dashboard that does not exist yet is not a valid "as code" ID. */
      readonly type: 'id';
      readonly message: string;
    };

const MAX_LISTED_ISSUES = 10;

const formatIssue = (issue: DashboardValidationIssue): string => {
  switch (issue.type) {
    case 'state': {
      const path = issue.path.map(String).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }
    case 'panel':
      return `panel of type "${issue.panelType}": ${issue.message}`;
    case 'id':
      return `id: ${issue.message}`;
    default: {
      const unhandled: never = issue;
      return unhandled;
    }
  }
};

/** Thrown by the dashboard server client when the dashboard is invalid; nothing was saved. */
export class DashboardValidationError extends Error {
  public readonly issues: readonly DashboardValidationIssue[];

  constructor(issues: readonly DashboardValidationIssue[]) {
    const unlisted = issues.length - MAX_LISTED_ISSUES;
    super(
      [
        'The dashboard is invalid:',
        ...issues.slice(0, MAX_LISTED_ISSUES).map((issue) => `- ${formatIssue(issue)}`),
        ...(unlisted > 0 ? [`- and ${unlisted} more`] : []),
      ].join('\n')
    );
    this.name = 'DashboardValidationError';
    this.issues = issues;
  }
}
