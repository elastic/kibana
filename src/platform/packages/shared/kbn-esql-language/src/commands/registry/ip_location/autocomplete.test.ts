/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockContext, getMockCallbacks } from '../../../__tests__/commands/context_fixtures';
import { suggest } from '../../../__tests__/commands/autocomplete';
import type { ICommandCallbacks } from '../types';
import { autocomplete } from './autocomplete';

interface ExpectedIpLocationSuggestions {
  contains?: string[];
  notContains?: string[];
}

const expectIpLocationSuggestions = async (
  query: string,
  expectedSuggestions: ExpectedIpLocationSuggestions,
  mockCallbacks?: ICommandCallbacks
) => {
  const results = await suggest(query, mockContext, 'ip_location', mockCallbacks, autocomplete);
  const texts = results.map((result) => result.text);

  if (expectedSuggestions.contains?.length) {
    expect(texts).toEqual(expect.arrayContaining(expectedSuggestions.contains));
  }

  if (expectedSuggestions.notContains?.length) {
    expectedSuggestions.notContains.forEach((suggestion) =>
      expect(texts).not.toContain(suggestion)
    );
  }
};

describe('IP_LOCATION Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suggests target field after command keyword', async () => {
    const mockCallbacks = getMockCallbacks();
    mockCallbacks.getSuggestedUserDefinedColumnName = jest.fn(() => 'col0');

    await expectIpLocationSuggestions(
      'FROM a | IP_LOCATION ',
      { contains: ['col0 = '] },
      mockCallbacks
    );
  });

  it('suggests assignment operator after target field', async () => {
    await expectIpLocationSuggestions('FROM a | IP_LOCATION geo ', { contains: ['= '] });
  });

  it('suggests IP and string fields after the assignment operator', async () => {
    const mockCallbacks = getMockCallbacks();
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue([
      { label: 'ipField', text: 'ipField ' },
      { label: 'keywordField', text: 'keywordField ' },
    ]);

    await expectIpLocationSuggestions(
      'FROM a | IP_LOCATION geo = ',
      { contains: ['ipField ', 'keywordField '] },
      mockCallbacks
    );
  });

  it('suggests WITH and pipe after a complete expression', async () => {
    await expectIpLocationSuggestions('FROM a | IP_LOCATION geo = ipField', {
      contains: ['WITH { $0 }', '| '],
    });
  });

  it('suggests map keys inside an empty options map', async () => {
    await expectIpLocationSuggestions('FROM a | IP_LOCATION geo = ipField WITH { ', {
      contains: ['"database_file": "$0"', '"first_only": ', '"properties": [ $0 ]'],
    });
  });

  it('suggests properties for the selected database file', async () => {
    await expectIpLocationSuggestions(
      'FROM a | IP_LOCATION geo = ipField WITH { "database_file": "GeoLite2-Country.mmdb", "properties": [ ',
      {
        contains: ['"continent_name"', '"country_iso_code"', '"country_name"'],
        notContains: ['"location"'],
      }
    );
  });

  it('suggests remaining property values after one is already selected', async () => {
    await expectIpLocationSuggestions(
      'FROM a | IP_LOCATION geo = ipField WITH { "properties": ["city_name", ',
      {
        contains: ['"country_name"', '"location"', '"region_name"'],
        notContains: ['"city_name"'],
      }
    );
  });
});
