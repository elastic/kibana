/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup } from 'src/core/public';
import { FieldFormatsRegistry, UI_SETTINGS } from '../../common';
import { deserializeFieldFormat } from './utils/deserialize';
import { FormatFactory } from '../../common/field_formats/utils';
import { baseFormattersPublic } from './constants';

export class FieldFormatsService {
  private readonly fieldFormatsRegistry: FieldFormatsRegistry = new FieldFormatsRegistry();

  public setup(core: CoreSetup) {
    core.uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP) {
        this.fieldFormatsRegistry.parseDefaultTypeMap(newValue);
      }
    });

    const getConfig = core.uiSettings.get.bind(core.uiSettings);

    this.fieldFormatsRegistry.init(
      getConfig,
      {
        parsedUrl: {
          origin: window.location.origin,
          pathname: window.location.pathname,
          basePath: core.http.basePath.get(),
        },
      },
      baseFormattersPublic
    );

    return this.fieldFormatsRegistry as FieldFormatsSetup;
  }

  public start() {
    this.fieldFormatsRegistry.deserialize = deserializeFieldFormat.bind(
      this.fieldFormatsRegistry as FieldFormatsStart
    );

    return this.fieldFormatsRegistry as FieldFormatsStart;
  }
}

/** @public */
export type FieldFormatsSetup = Pick<FieldFormatsRegistry, 'register'>;

/** @public */
export type FieldFormatsStart = Omit<FieldFormatsRegistry, 'init' & 'register'> & {
  deserialize: FormatFactory;
};
