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
// @ts-ignore
import { DocViewsRegistryProvider } from 'ui/registry/doc_views';
import { i18n } from '@kbn/i18n';
import { JsonCodeEditor } from './json_code_editor';

/*
 * Registration of the the doc view: json
 * - used to display an ES hit as pretty printed JSON at Discover
 * - registered as angular directive to stay compatible with community plugins
 */
DocViewsRegistryProvider.register(function(reactDirective: any) {
  const reactDir = reactDirective(JsonCodeEditor, ['hit']);
  // setting of reactDir.scope is required to assign $scope props
  // to the react component via render-directive in doc_viewer.js
  reactDir.scope = {
    hit: '=',
  };
  return {
    title: i18n.translate('kbnDocViews.json.jsonTitle', {
      defaultMessage: 'JSON',
    }),
    order: 20,
    directive: reactDir,
  };
});
