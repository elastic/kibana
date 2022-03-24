/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { Authorization } from './authorization_provider';
export {
  AuthorizationProvider,
  AuthorizationContext,
  useAuthorizationContext,
} from './authorization_provider';

export { WithPrivileges } from './with_privileges';

export { NotAuthorizedSection } from './not_authorized_section';

export { SectionError } from './section_error';

export { PageError } from './page_error';
