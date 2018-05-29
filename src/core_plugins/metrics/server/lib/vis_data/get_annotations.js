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

import buildAnnotationRequest from './build_annotation_request';
import handleAnnotationResponse from './handle_annotation_response';

function validAnnotation(annotation) {
  return annotation.index_pattern &&
    annotation.time_field &&
    annotation.fields &&
    annotation.icon &&
    annotation.template;
}

export default async (req, panel) => {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const bodies = panel.annotations
    .filter(validAnnotation)
    .map(annotation => {

      const indexPattern = annotation.index_pattern;
      const bodies = [];

      bodies.push({
        index: indexPattern,
        ignore: [404],
        timeout: '90s',
        requestTimeout: 90000,
        ignoreUnavailable: true,
      });

      bodies.push(buildAnnotationRequest(req, panel, annotation));
      return bodies;
    });

  if (!bodies.length) return { responses: [] };
  try {
    const resp = await callWithRequest(req, 'msearch', {
      body: bodies.reduce((acc, item) => acc.concat(item), [])
    });
    const results = {};
    panel.annotations
      .filter(validAnnotation)
      .forEach((annotation, index) => {
        const data = resp.responses[index];
        results[annotation.id] = handleAnnotationResponse(data, annotation);
      });
    return results;
  } catch (error) {
    if (error.message === 'missing-indices') return { responses: [] };
    throw error;
  }

};

