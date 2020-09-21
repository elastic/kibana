/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    const data = await searchStrategy.search(req.framework.core, req.requestContext, searches);

    return annotations.reduce((acc, annotation, index) => {
      acc[annotation.id] = handleAnnotationResponseBy(data[index].rawResponse, annotation);

      return acc;
    }, {});
  } catch (error) {
    if (error.message === 'missing-indices') return { responses: [] };
    throw error;
  }
}
