/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import stubbedLogstashFields from './logstash_fields';
import { getKbnFieldType } from '../../../data/common';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getStubIndexPattern } from '../../../data/public/test_utils';
import { uiSettingsServiceMock } from '../../../../core/public/mocks';

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
