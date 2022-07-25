/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { i18n } from '@kbn/i18n';
import { KbnError } from '@kbn/kibana-utils-plugin/public';

export class VislibError extends KbnError {
  constructor(message: string) {
    super(message);
  }

  displayToScreen(handler: any) {
    handler.error(this.message);
  }
}

export class InvalidLogScaleValues extends VislibError {
  constructor() {
    super('Values less than 1 cannot be displayed on a log scale');
  }
}

export class ContainerTooSmall extends VislibError {
  constructor() {
    super('This container is too small to render the visualization');
  }
}

export class PieContainsAllZeros extends VislibError {
  constructor() {
    super('No results displayed because all values equal 0.');
  }
}

export class NoResults extends VislibError {
  constructor() {
    super(
      i18n.translate('visTypeVislib.vislib.errors.noResultsFoundTitle', {
        defaultMessage: 'No results found',
      })
    );
  }
}
