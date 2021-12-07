/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { handleAnnotationResponse } from './response_processors/annotations';
import { AnnotationServices, getAnnotationRequestParams } from './annotations/get_request_params';
import { getLastSeriesTimestamp } from './helpers/timestamp';
import type { VisTypeTimeseriesVisDataRequest } from '../../types';
import type { Annotation, Panel } from '../../../common/types';
import type { PanelSeries } from '../../../common/types/vis_data';

function validAnnotation(annotation: Annotation) {
  return annotation.fields && annotation.icon && annotation.template && !annotation.hidden;
}

interface GetAnnotationsParams {
  req: VisTypeTimeseriesVisDataRequest;
  panel: Panel;
  series: Array<PanelSeries['series']>;
  services: AnnotationServices;
}

export async function getAnnotations({ req, panel, series, services }: GetAnnotationsParams) {
  const annotations = panel.annotations!.filter(validAnnotation);
  const lastSeriesTimestamp = getLastSeriesTimestamp(series);
  const handleAnnotationResponseBy = handleAnnotationResponse(lastSeriesTimestamp);

  const bodiesPromises = annotations.map((annotation) =>
    getAnnotationRequestParams(req, panel, annotation, services)
  );

  const searches = (await Promise.all(bodiesPromises)).reduce(
    (acc, items) => acc.concat(items as any),
    []
  );

  if (!searches.length) return { responses: [] };

  try {
    const data = await services.searchStrategy.search(services.requestContext, req, searches);

    return annotations.reduce((acc, annotation, index) => {
      acc[annotation.id] = handleAnnotationResponseBy(data[index].rawResponse, annotation);

      return acc;
    }, {} as { [key: string]: any });
  } catch (error) {
    if (error.message === 'missing-indices') return { responses: [] };
    throw error;
  }
}
