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

const QUOTED_STRING = /"(?:[^"\\]|\\.)*"/g;
const REPORT_TO_PARAMETER = /;\s*report-to\s*=/;

/**
 * Splits a Permissions-Policy dictionary into its members on top-level commas, skipping commas
 * inside inner lists and quoted strings. Returns `undefined` when the policy is not a dictionary
 * that can be split unambiguously.
 */
const splitMembers = (policy: string): string[] | undefined => {
  const members: string[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;

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
    } else if (char === ',' && depth === 0) {
      members.push(policy.slice(start, i));
      start = i + 1;
    }
  }
  members.push(policy.slice(start));

  if (inString || depth !== 0 || members.some((member) => !member.trim())) {
    return undefined;
  }
  return members;
};

/**
 * Attaches a `report-to` parameter to every member of a Permissions-Policy header.
 *
 * `report-to` is a parameter of each member, not of the header, so a single parameter appended to
 * the end only applies to the last directive. Browsers send violations of every other directive to
 * the `default` endpoint group, which is not declared, and drop them. See
 * https://www.w3.org/TR/permissions-policy/#reporting
 *
 * A member that already carries `report-to` is left alone. When the endpoint name is not a valid
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
    .map((member) => {
      if (REPORT_TO_PARAMETER.test(member.replace(QUOTED_STRING, '""'))) {
        return member;
      }
      // Keep the separator's whitespace, but put the parameter directly after the member.
      return `${member.trimEnd()}${parameter}`;
    })
    .join(',');
};
