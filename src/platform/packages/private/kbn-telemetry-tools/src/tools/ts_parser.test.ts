/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseUsageCollection } from './ts_parser';
import { parsedWorkingCollector } from './__fixture__/parsed_working_collector';
import { parsedNestedCollector } from './__fixture__/parsed_nested_collector';
import { parsedExternallyDefinedCollector } from './__fixture__/parsed_externally_defined_collector';
import { parsedImportedUsageInterface } from './__fixture__/parsed_imported_usage_interface';
import { parsedImportedSchemaCollector } from './__fixture__/parsed_imported_schema';
import { parsedSchemaDefinedWithSpreadsCollector } from './__fixture__/parsed_schema_defined_with_spreads_collector';
import { parsedStatsCollector } from './__fixture__/parsed_stats_collector';
import { parsedImportedInterfaceFromExport } from './__fixture__/parsed_imported_interface_from_export';
import { loadFixtureProgram } from './test_utils';

describe('parseUsageCollection', () => {
  it.todo('throws when a function is returned from fetch');
  it.todo('throws when an object is not returned from fetch');

  it('throws when `makeUsageCollector` argument is a function call', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'telemetry_collectors/externally_defined_usage_collector/index.ts'
    );
    expect(() => [...parseUsageCollection(sourceFile, program)]).toThrowErrorMatchingSnapshot();
  });

  it('throws when mapping fields is not defined', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'telemetry_collectors/unmapped_collector.ts'
    );
    expect(() => [...parseUsageCollection(sourceFile, program)]).toThrowErrorMatchingSnapshot();
  });

  it('parses root level defined collector', () => {
    const { program, sourceFile } = loadFixtureProgram('telemetry_collectors/working_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([parsedWorkingCollector]);
  });

  it('parses collector with schema defined as union of spreads', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'telemetry_collectors/schema_defined_with_spreads_collector.ts'
    );
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([parsedSchemaDefinedWithSpreadsCollector]);
  });

  it('parses nested collectors', () => {
    const { program, sourceFile } = loadFixtureProgram('telemetry_collectors/nested_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([parsedNestedCollector]);
  });

  it('parses imported schema property', () => {
    const { program, sourceFile } = loadFixtureProgram('telemetry_collectors/imported_schema.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedImportedSchemaCollector);
  });

  it('parses externally defined collectors', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'telemetry_collectors/externally_defined_collector.ts'
    );
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedExternallyDefinedCollector);
  });

  it('parses imported Usage interface', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'telemetry_collectors/imported_usage_interface.ts'
    );
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedImportedUsageInterface);
  });

  it('parses stats collectors, discarding those without schemas', () => {
    const { program, sourceFile } = loadFixtureProgram('telemetry_collectors/stats_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedStatsCollector);
  });

  it('follows `export { Usage } from "./path"` expressions', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'telemetry_collectors/imported_interface_from_export/index.ts'
    );
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedImportedInterfaceFromExport);
  });

  it('skips files that do not define a collector', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'telemetry_collectors/file_with_no_collector.ts'
    );
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([]);
  });
});
