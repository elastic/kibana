/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin } from '@kbn/core/public';

// This plugin should really be a package, but we have to currently have to put the components in a "public"
// directory to avoid violating the @kbn/imports/no_boundary_crossing rules.
//
// Moving the dependencies of this plugin (unified search, unified field list) to static packages will
// make it possible to convert this to a package as well.
export class VisualizationUiComponentsPlugin implements Plugin<{}, {}> {
  public setup() {
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
