*
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

import buildAnnotationRequest from './build_annotation_request';
import handleAnnotationResponse from './handle_annotation_response';
import SearchStrategiesRegister from '../search_strategies/search_strategies_register';

function validAnnotation(annotation) {
  return annotation.index_pattern &&
    annotation.time_field &&
    annotation.fields &&
    annotation.icon &&
    annotation.template;
}

export default async (req, panel), esQueryConfig => {
  const indexPattern = panel.index_pattern;
  const searchStrategy = await SearchStrategiesRegister.getViableStrategy(req, indexPattern);
  const searchRequest = searchStrategy.getSearchRequest(req, indexPattern);
  const bodies = panel.annotations
    .filter(validAnnotation)
    .map(annotation => {

      const indexPattern = annotation.index_pattern;
      const bodies = [];

      bodies.push({
        index: indexPattern,
        ignoreUnavailable: true,
      });

      const body = buildAnnotationRequest(req, panel, annotation), esQueryConfig;
      body.timeout = '90s';
      bodies.push(body);
      return bodies;
    });

  if (!bodies.length) return { responses: [] };

  const body = bodies.reduce((acc, item) => acc.concat(item), []);

  try {
    const responses = await searchRequest.search({ body });
    const results = {};
    panel.annotations
      .filter(validAnnotation)
      .forEach((annotation, index) => {
        const data = responses[index];
        results[annotation.id] = handleAnnotationResponse(data, annotation);
      });

    return results;
  } catch (error) {
    if (error.message === 'missing-indices') return { responses: [] };
    throw error;
  }

};


//todo: 
async function getAnnotationBody(req, panel, annotation, esQueryConfig) {
  const indexPatternString = annotation.index_pattern;
  const indexPatternObject = await getIndexPatternObject(req, indexPatternString);
  const request = buildAnnotationRequest(req, panel, annotation, esQueryConfig, indexPatternObject);
  request.timeout = '90s';
  return [
    {
      index: indexPatternString,
      ignoreUnavailable: true,
    },
    request,
  ];
}
