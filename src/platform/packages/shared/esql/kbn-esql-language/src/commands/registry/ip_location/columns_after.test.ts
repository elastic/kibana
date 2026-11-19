/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { ESQLAstIpLocationCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

const previousColumns: ESQLColumnData[] = [{ name: 'ipField', type: 'ip', userDefined: false }];

const col = (suffix: string, type: ESQLColumnData['type'] = 'keyword'): ESQLColumnData => ({
  name: `geo.${suffix}`,
  type,
  userDefined: false,
});

const command = (text: string): ESQLAstIpLocationCommand => {
  const { root } = Parser.parse(`FROM a | ${text}`);
  return root.commands[1] as ESQLAstIpLocationCommand;
};

describe('IP_LOCATION > columnsAfter', () => {
  it('adds GeoLite2-City default columns and preserves previous columns', () => {
    const result = columnsAfter(command('IP_LOCATION geo = ipField'), previousColumns);

    expect(result).toEqual([
      ...previousColumns,
      col('city_name'),
      col('continent_name'),
      col('country_iso_code'),
      col('country_name'),
      col('location', 'geo_point'),
      col('region_iso_code'),
      col('region_name'),
    ]);
  });

  it('uses default columns from the selected database_file variant', () => {
    const result = columnsAfter(
      command('IP_LOCATION geo = ipField WITH { "database_file": "GeoLite2-Country.mmdb" }'),
      previousColumns
    );

    expect(result.slice(previousColumns.length)).toEqual([
      col('continent_name'),
      col('country_iso_code'),
      col('country_name'),
    ]);
  });

  it('limits selected properties to fields available for the selected database_file variant', () => {
    const result = columnsAfter(
      command(
        'IP_LOCATION geo = ipField WITH { "database_file": "GeoLite2-Country.mmdb", "properties": ["country_name", "location"] }'
      ),
      previousColumns
    );

    expect(result.slice(previousColumns.length)).toEqual([col('country_name')]);
  });

  it('does not add default columns for custom database files, but adds selected known properties', () => {
    const customDefaults = columnsAfter(
      command('IP_LOCATION geo = ipField WITH { "database_file": "custom.mmdb" }'),
      previousColumns
    );
    const customSelectedProperties = columnsAfter(
      command(
        'IP_LOCATION geo = ipField WITH { "database_file": "custom.mmdb", "properties": ["location", "asn"] }'
      ),
      previousColumns
    );

    expect(customDefaults.slice(previousColumns.length)).toEqual([]);
    expect(customSelectedProperties.slice(previousColumns.length)).toEqual([
      col('location', 'geo_point'),
      col('asn', 'long'),
    ]);
  });

  it('stores raw (unescaped) column names when the target is a reserved keyword', () => {
    const result = columnsAfter(command('IP_LOCATION ip_location = ipField'), previousColumns);

    const names = result.slice(previousColumns.length).map(({ name }) => name);
    expect(names).toEqual([
      'ip_location.city_name',
      'ip_location.continent_name',
      'ip_location.country_iso_code',
      'ip_location.country_name',
      'ip_location.location',
      'ip_location.region_iso_code',
      'ip_location.region_name',
    ]);
  });

  it('returns previous columns unchanged when targetField is absent', () => {
    const result = columnsAfter(
      { type: 'command', name: 'ip_location', args: [] } as unknown as ESQLAstIpLocationCommand,
      previousColumns
    );

    expect(result).toEqual(previousColumns);
  });
});
