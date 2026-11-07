/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryProfileView } from './aggregate_esql_profile';

export interface ProfileBaseline {
  view: QueryProfileView;
  query: string;
}

/**
 * The run to compare against. It is kept in memory for the page session, so it survives closing
 * and reopening the inspector, which is how someone edits a query and profiles it again.
 */
let baseline: ProfileBaseline | undefined;

export const getProfileBaseline = (): ProfileBaseline | undefined => baseline;

export const setProfileBaseline = (next: ProfileBaseline | undefined): void => {
  baseline = next;
};
