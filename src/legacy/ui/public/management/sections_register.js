/*
 * THIS FILE HAS BEEN MODIFIED FROM THE ORIGINAL SOURCE
 * This comment only applies to modifications applied after the e633644c43a0a0271e0b6c32c382ce1db6b413c3 commit
 *
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

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

import { ManagementSection } from './section';
import { i18n } from '@kbn/i18n';

export const management = new ManagementSection('management', {
  display: i18n.translate('common.ui.management.displayName', {
    defaultMessage: 'Management',
  }),
});

management.register('data', {
  display: i18n.translate('common.ui.management.connectDataDisplayName', {
    defaultMessage: 'Connect Data',
  }),
  order: 0,
});

management.register('elasticsearch', {
  display: 'Elasticsearch',
  order: 20,
  icon: 'logoElasticsearch',
});

management.register('kibana', {
  display: 'NetMon-UI',
  order: 30,
  icon: 'logoKibana',
});

management.register('logstash', {
  display: 'Logstash',
  order: 30,
  icon: 'logoLogstash',
});
