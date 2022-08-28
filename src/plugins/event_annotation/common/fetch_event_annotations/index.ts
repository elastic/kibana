/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defer, switchMap, Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { ExpressionValueSearchContext, parseEsInterval } from '@kbn/data-plugin/common';
import type { ExpressionFunctionDefinition, Datatable } from '@kbn/expressions-plugin/common';
import moment from 'moment';
import { ESCalendarInterval, ESFixedInterval, roundDateToESInterval } from '@elastic/charts';
import { EventAnnotationGroupOutput } from '../event_annotation_group';
import { annotationColumns, EventAnnotationOutput } from '../manual_event_annotation/types';
import { filterOutOfTimeRange, isManualPointAnnotation, sortByTime } from './utils';

export interface FetchEventAnnotationsDatatable {
  annotations: EventAnnotationOutput[];
  type: 'fetch_event_annotations';
}

export type FetchEventAnnotationsOutput = Observable<Datatable>;

export interface FetchEventAnnotationsArgs {
  group: EventAnnotationGroupOutput[];
  interval: string;
}

export type FetchEventAnnotationsExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'fetch_event_annotations',
  ExpressionValueSearchContext | null,
  FetchEventAnnotationsArgs,
  FetchEventAnnotationsOutput
>;

export function fetchEventAnnotations(): FetchEventAnnotationsExpressionFunctionDefinition {
  return {
    name: 'fetch_event_annotations',
    aliases: [],
    type: 'datatable',
    inputTypes: ['kibana_context', 'null'],
    help: i18n.translate('eventAnnotation.fetchEventAnnotations.description', {
      defaultMessage: 'Fetch event annotations',
    }),
    args: {
      group: {
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
    fn: (input, args) => {
      return defer(async () => {
        const annotations = args.group
          .flatMap((group) => group.annotations)
          .filter(
            (annotation) =>
              !annotation.isHidden && filterOutOfTimeRange(annotation, input?.timeRange)
          );
        // TODO: fetching for Query annotations goes here

        return { annotations };
      }).pipe(
        switchMap(({ annotations }) => {
          const datatable: Datatable = {
            type: 'datatable',
            columns: annotationColumns,
            rows: annotations.sort(sortByTime).map((annotation) => {
              const initialDate = moment(annotation.time).valueOf();
              const snappedDate = roundDateToESInterval(
                initialDate,
                parseEsInterval(args.interval) as ESCalendarInterval | ESFixedInterval,
                'start',
                'UTC'
              );
              return {
                ...annotation,
                type: isManualPointAnnotation(annotation) ? 'point' : 'range',
                timebucket: moment(snappedDate).toISOString(),
              };
            }),
          };

          return new Observable<Datatable>((subscriber) => {
            subscriber.next(datatable);
            subscriber.complete();
          });
        })
      );
    },
  };
}
