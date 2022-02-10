/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../src/core/server';
import { FieldFormatsSetup, FieldFormatsStart } from '../../../src/plugins/field_formats/server';
import { registerExampleFormat } from './examples/2_creating_custom_formatter';

interface SetupDeps {
  fieldFormats: FieldFormatsSetup;
}

interface StartDeps {
  fieldFormats: FieldFormatsStart;
}

export class FieldFormatsExamplePlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, deps: SetupDeps) {
    registerExampleFormat(deps.fieldFormats);
  }
  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
