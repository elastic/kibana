/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * RFC 8941 sf-token, the grammar the `report-to` parameter value is serialized as. A value outside
 * it would terminate the parameter and inject further members into the policy.
 */
const REPORTING_GROUP_NAME = /^[A-Za-z*][A-Za-z0-9!#$%&'*+\-.^_`|~:/]*$/;

/**
 * Every `report-to` parameter, capturing its value when it has one. A bare `report-to` is a boolean.
 * Quoted strings are already removed from the text this runs on, so a quoted value captures as empty.
 */
const REPORT_TO_PARAMETERS = /;\s*report-to(?:=([^;]*))?(?=;|\s*$)/g;

/** The first character of a token, the only form of `report-to` value that browsers honor. */
const TOKEN_START = /^[A-Za-z*]/;

/**
 * Whether a member already reports somewhere. A repeated parameter takes its last value, so only the
 * last `report-to` counts, and only when its value is a token. Otherwise the member still needs ours,
 * which is appended last and so takes effect.
 */
const hasOwnReportTo = (topLevel: string): boolean => {
  const last = [...topLevel.matchAll(REPORT_TO_PARAMETERS)].at(-1);
  return last !== undefined && TOKEN_START.test(last[1] ?? '');
};

interface PolicyMember {
  /** The member as written. */
  readonly text: string;
  /**
   * The member without its inner list and quoted strings. A parameter left here belongs to the
   * member itself, which is the only place a browser reads `report-to` from. A parameter inside the
   * inner list belongs to one origin and is ignored for reporting.
   */
  readonly topLevel: string;
}

/**
 * Splits a Permissions-Policy dictionary into its members on top-level commas, skipping commas
 * inside inner lists and quoted strings. Returns `undefined` when the policy is not a dictionary
 * that can be split unambiguously.
 */
const splitMembers = (policy: string): PolicyMember[] | undefined => {
  const members: PolicyMember[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  let topLevel = '';

  for (let i = 0; i < policy.length; i++) {
    const char = policy[i];
    if (inString) {
      if (char === '\\') {
        i++;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      if (--depth < 0) {
        return undefined;
      }
    } else if (depth === 0) {
      if (char === ',') {
        members.push({ text: policy.slice(start, i), topLevel });
        start = i + 1;
        topLevel = '';
      } else {
        topLevel += char;
      }
    }
  }
  members.push({ text: policy.slice(start), topLevel });

  if (inString || depth !== 0 || members.some(({ text }) => !text.trim())) {
    return undefined;
  }
  return members;
};

/**
 * Attaches a `report-to` parameter to every member of a Permissions-Policy header.
 *
 * `report-to` is a parameter of each member, not of the header, so a single parameter appended to
 * the end only applies to the last directive. Browsers send violations of every other directive to
 * the `default` endpoint, and drop them unless one is declared. See
 * https://www.w3.org/TR/permissions-policy/#reporting
 *
 * A member that already carries its own `report-to` is left alone. When the endpoint name is not a valid
 * token, or the policy cannot be split unambiguously, the parameter is appended once to the end of
 * the header, which is how it was always sent.
 */
export const addReportToParameter = (policy: string, reportTo: string): string => {
  const parameter = `;report-to=${reportTo}`;
  const members = REPORTING_GROUP_NAME.test(reportTo) ? splitMembers(policy) : undefined;
  if (!members) {
    return `${policy}${parameter}`;
  }

  return members
    .map(({ text, topLevel }) => {
      if (hasOwnReportTo(topLevel)) {
        return text;
      }
      // Keep the separator's whitespace, but put the parameter directly after the member.
      return `${text.trimEnd()}${parameter}`;
    })
    .join(',');
};
