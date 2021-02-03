/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
