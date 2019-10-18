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

import './saved_searches/saved_searches';
import { i18n } from '@kbn/i18n';

import './angular/directives';
import 'ui/collapsible_sidebar';
import './components/field_chooser/field_chooser';
import './angular/discover';
import './doc_table/components/table_row';
import { FeatureCatalogueRegistryProvider, FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';
import './doc';
import './context';

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'discover',
    title: i18n.translate('kbn.discover.discoverTitle', {
      defaultMessage: 'Discover',
    }),
    description: i18n.translate('kbn.discover.discoverDescription', {
      defaultMessage: 'Interactively explore your data by querying and filtering raw documents.',
    }),
    icon: 'discoverApp',
    path: '/app/kibana#/discover',
    showOnHomePage: true,
    category: FeatureCatalogueCategory.DATA
  };
});
