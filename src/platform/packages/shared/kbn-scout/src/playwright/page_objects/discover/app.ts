/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CascadeMixin } from './cascade';

/**
 * Concrete page object for the Discover application.
 *
 * All functionality lives in the mixin chain:
 * `CascadeMixin → LayoutMixin → SaveMixin → NavigationMixin → DiscoverAppBase`
 *
 * Layer C (`discover/test/scout`) will subclass this with `DiscoverPage extends DiscoverApp`
 * and rebind the `discover` fixture key, moving Discover-only surface out of the
 * `kbn-scout` critical-files path.
 */
export class DiscoverApp extends CascadeMixin {}
