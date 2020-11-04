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

import stubbedLogstashFields from 'fixtures/logstash_fields';

import { getKbnFieldType } from '../plugins/data/common';
import { getStubIndexPattern } from '../plugins/data/public/test_utils';
import { uiSettingsServiceMock } from '../core/public/ui_settings/ui_settings_service.mock';

const uiSettingSetupMock = uiSettingsServiceMock.createSetupContract();
uiSettingSetupMock.get.mockImplementation((item, defaultValue) => {
  return defaultValue;
});

export default function stubbedLogstashIndexPatternService() {
  const mockLogstashFields = stubbedLogstashFields();

  const fields = mockLogstashFields.map(function (field) {
    const kbnType = getKbnFieldType(field.type);

    if (!kbnType || kbnType.name === 'unknown') {
      throw new TypeError(`unknown type ${field.type}`);
    }

    return {
      ...field,
      sortable: 'sortable' in field ? !!field.sortable : kbnType.sortable,
      filterable: 'filterable' in field ? !!field.filterable : kbnType.filterable,
      displayName: field.name,
    };
  });

  const indexPattern = getStubIndexPattern('logstash-*', (cfg) => cfg, 'time', fields, {
    uiSettings: uiSettingSetupMock,
  });

  indexPattern.id = 'logstash-*';
  indexPattern.isTimeNanosBased = () => false;

  return indexPattern;
}
