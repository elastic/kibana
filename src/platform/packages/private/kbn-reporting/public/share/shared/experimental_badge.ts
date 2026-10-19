/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ExportShareConfig } from '@kbn/share-plugin/public';

/**
 * Badge marking PDF/PNG exports as experimental on serverless; delete it when they reach GA.
 */
export const getServerlessExperimentalBadge = (
  isServerless: boolean
): ExportShareConfig['config']['badge'] =>
  isServerless
    ? {
        label: i18n.translate('reporting.share.experimentalBadge.label', {
          defaultMessage: 'Experimental',
        }),
        tooltipContent: i18n.translate('reporting.share.experimentalBadge.tooltipContent', {
          defaultMessage:
            'This functionality is experimental and may be changed or removed in a future release.',
        }),
      }
    : undefined;
