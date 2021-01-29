/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { handleAnnotationResponse } from './response_processors/annotations';
import { getAnnotationRequestParams } from './annotations/get_request_params';
import { getLastSeriesTimestamp } from './helpers/timestamp';

function validAnnotation(annotation) {
  return (
    annotation.index_pattern &&
    annotation.time_field &&
    annotation.fields &&
    annotation.icon &&
    annotation.template &&
    !annotation.hidden
  );
}

export async function getAnnotations({
  req,
  esQueryConfig,
  searchStrategy,
  panel,
  capabilities,
  series,
}) {
  const annotations = panel.annotations.filter(validAnnotation);
  const lastSeriesTimestamp = getLastSeriesTimestamp(series);
  const handleAnnotationResponseBy = handleAnnotationResponse(lastSeriesTimestamp);

  const bodiesPromises = annotations.map((annotation) =>
    getAnnotationRequestParams(req, panel, annotation, esQueryConfig, capabilities)
  );

  const searches = (await Promise.all(bodiesPromises)).reduce(
    (acc, items) => acc.concat(items),
    []
  );

  if (!searches.length) return { responses: [] };

  try {
    const data = await searchStrategy.search(req, searches);

    return annotations.reduce((acc, annotation, index) => {
      acc[annotation.id] = handleAnnotationResponseBy(data[index].rawResponse, annotation);

      return acc;
    }, {});
  } catch (error) {
    if (error.message === 'missing-indices') return { responses: [] };
    throw error;
  }
}
