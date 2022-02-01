/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RedirectAppLinks } from './redirect_app_link';
export type { RedirectCrossAppLinksProps } from './redirect_app_link';

export { RedirectAppLinks } from './redirect_app_link';

/**
 * Exporting the RedirectAppLinks component as a default export so it can be
 * loaded by React.lazy.
 */
export default RedirectAppLinks;
