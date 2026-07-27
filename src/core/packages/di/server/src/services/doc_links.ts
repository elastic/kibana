/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import { createToken } from '@kbn/core-di';
import type { ServiceToken } from '@kbn/core-di';

/**
 * The documentation links.
 * @see {@link DocLinksServiceSetup}
 * @public
 */
export type IDocLinks = DocLinksServiceSetup;

/**
 * The documentation links service.
 * @see {@link IDocLinks}
 * @public
 */
export const DocLinks: ServiceToken<IDocLinks> = createToken('DocLinks');
