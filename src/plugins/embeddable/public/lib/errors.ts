/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */
import { i18n } from '@kbn/i18n';

export class PanelNotFoundError extends Error {
  code = 'PANEL_NOT_FOUND';

  constructor() {
    super(
      i18n.translate('embeddableApi.errors.paneldoesNotExist', {
        defaultMessage: 'Panel not found',
      })
    );
  }
}

export class PanelIncompatibleError extends Error {
  code = 'PANEL_INCOMPATIBLE';

  constructor() {
    super(
      i18n.translate('embeddableApi.errors.panelIncompatibleError', {
        defaultMessage: 'Panel api is incompatible',
      })
    );
  }
}

export class EmbeddableFactoryNotFoundError extends Error {
  code = 'EMBEDDABLE_FACTORY_NOT_FOUND';

  constructor(type: string) {
    super(
      i18n.translate('embeddableApi.errors.embeddableFactoryNotFound', {
        defaultMessage: `{type} can't be loaded. Please upgrade to the default distribution of Elasticsearch and Kibana with the appropriate license.`,
        values: {
          type,
        },
      })
    );
  }
}
