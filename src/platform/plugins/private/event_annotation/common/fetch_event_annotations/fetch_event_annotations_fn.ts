/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FetchEventAnnotationsExpressionFunctionDefinition } from './types';

/** @internal */
export const getFetchEventAnnotationsMeta: () => Omit<
  FetchEventAnnotationsExpressionFunctionDefinition,
  'fn'
> = () => ({
  name: 'fetch_event_annotations',
  aliases: [],
  type: 'datatable',
  inputTypes: ['kibana_context', 'null'],
  help: i18n.translate('eventAnnotation.fetchEventAnnotations.description', {
    defaultMessage: 'Fetch event annotations',
  }),
  args: {
    groups: {
      types: ['event_annotation_group'],
      help: i18n.translate('eventAnnotation.fetchEventAnnotations.args.annotationConfigs', {
        defaultMessage: 'Annotation configs',
      }),
      multi: true,
    },
    interval: {
      required: true,
      types: ['string'],
      help: i18n.translate('eventAnnotation.fetchEventAnnotations.args.interval.help', {
        defaultMessage: 'Interval to use for this aggregation',
      }),
    },
  },
});
