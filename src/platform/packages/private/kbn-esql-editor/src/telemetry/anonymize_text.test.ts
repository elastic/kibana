/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { anonymizeText } from './anonymize_text';

describe('anonymizeText', () => {
  it('masks emails, ip addresses, host names, phone numbers and names', () => {
    expect(
      anonymizeText(
        'john.smith@example.com from 10.10.100.200 or web-01.corp.local, call +1 555 123 4567, (555) 123-4567 or +48600700800, ask Łukasz Nowak'
      )
    ).toBe('[EMAIL] from [IP] or [HOST_NAME], call [PHONE], [PHONE] or [PHONE], ask [NAME]');
  });

  it('leaves ES|QL, dates, timestamps, numbers and index names intact', () => {
    const query =
      'FROM logs-*, .ds-logs-default-2024.01.15-000001 | WHERE @timestamp > "2024-01-15T10:00:00.000Z" AND bytes > 1000 | STATS Count = COUNT(*) BY Region | LIMIT 500';

    expect(anonymizeText(query)).toBe(query);
  });
});
