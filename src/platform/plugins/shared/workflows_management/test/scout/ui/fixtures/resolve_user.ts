/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SamlAuth } from '@kbn/scout';

export interface ResolvedUser {
  username: string;
  displayName: string;
}

/**
 * Resolves the identity a role actually logs in as, since local SAML synthesizes
 * `elastic_<role>` / `test <role>` while Cloud authenticates a real QA account.
 */
export const resolveUser = async (samlAuth: SamlAuth, role: string): Promise<ResolvedUser> => {
  const { username, full_name: fullName, email } = await samlAuth.session.getUserData(role);
  return { username, displayName: fullName || email || username };
};
