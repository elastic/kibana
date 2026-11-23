/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * How a connector's drift issue is found again on GitHub: every issue carries the label, and names
 * its connector in a marker hidden in the body, since the title changes with the findings.
 */

/** The label of every drift issue. */
export const DRIFT_ISSUE_LABEL = 'connector-validation';

/** The hidden marker that names an issue's connector. */
export const markerOf = (connector: string): string => `<!-- ${DRIFT_ISSUE_LABEL}:${connector} -->`;

const MARKER_PATTERN = new RegExp(`<!-- ${DRIFT_ISSUE_LABEL}:(\\S+) -->`);

/** The connector an issue body names, if it carries a marker. */
export const connectorOf = (body: string): string | undefined => body.match(MARKER_PATTERN)?.[1];
