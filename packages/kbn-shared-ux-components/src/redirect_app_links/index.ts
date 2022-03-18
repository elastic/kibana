/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint-disable import/no-default-export */

import { RedirectAppLinks } from './redirect_app_links';
export type { RedirectAppLinksProps } from './redirect_app_links';

export { RedirectAppLinks } from './redirect_app_links';

/**
 * Exporting the RedirectAppLinks component as a default export so it can be
 * loaded by React.lazy.
 */
export default RedirectAppLinks;
