/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseUsageCollection } from './ts_parser';
import * as ts from 'typescript';
import * as path from 'path';
import { compilerHost } from './compiler_host';
import { parsedWorkingCollector } from './__fixture__/parsed_working_collector';
import { parsedNestedCollector } from './__fixture__/parsed_nested_collector';
import { parsedExternallyDefinedCollector } from './__fixture__/parsed_externally_defined_collector';
import { parsedImportedUsageInterface } from './__fixture__/parsed_imported_usage_interface';
import { parsedImportedSchemaCollector } from './__fixture__/parsed_imported_schema';
import { parsedSchemaDefinedWithSpreadsCollector } from './__fixture__/parsed_schema_defined_with_spreads_collector';
import { parsedStatsCollector } from './__fixture__/parsed_stats_collector';
import { parsedImportedInterfaceFromExport } from './__fixture__/parsed_imported_interface_from_export';

export function loadFixtureProgram(fixtureName: string) {
  const fixturePath = path.resolve(
    process.cwd(),
    'src',
    'fixtures',
    'telemetry_collectors',
    `${fixtureName}`
  );
  const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
  if (!tsConfig) {
    throw new Error('Could not find a valid tsconfig.json.');
  }
  const program = ts.createProgram([fixturePath], tsConfig as any, compilerHost);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fixturePath);
  if (!sourceFile) {
    throw Error('sourceFile is undefined!');
  }
  return { program, checker, sourceFile };
}

describe('parseUsageCollection', () => {
  it.todo('throws when a function is returned from fetch');
  it.todo('throws when an object is not returned from fetch');

  it('throws when `makeUsageCollector` argument is a function call', () => {
    const { program, sourceFile } = loadFixtureProgram(
      'externally_defined_usage_collector/index.ts'
    );
    expect(() => [...parseUsageCollection(sourceFile, program)]).toThrowErrorMatchingSnapshot();
  });

  it('throws when mapping fields is not defined', () => {
    const { program, sourceFile } = loadFixtureProgram('unmapped_collector.ts');
    expect(() => [...parseUsageCollection(sourceFile, program)]).toThrowErrorMatchingSnapshot();
  });

  it('parses root level defined collector', () => {
    const { program, sourceFile } = loadFixtureProgram('working_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([parsedWorkingCollector]);
  });

  it('parses collector with schema defined as union of spreads', () => {
    const { program, sourceFile } = loadFixtureProgram('schema_defined_with_spreads_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([parsedSchemaDefinedWithSpreadsCollector]);
  });

  it('parses nested collectors', () => {
    const { program, sourceFile } = loadFixtureProgram('nested_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([parsedNestedCollector]);
  });

  it('parses imported schema property', () => {
    const { program, sourceFile } = loadFixtureProgram('imported_schema.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedImportedSchemaCollector);
  });

  it('parses externally defined collectors', () => {
    const { program, sourceFile } = loadFixtureProgram('externally_defined_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedExternallyDefinedCollector);
  });

  it('parses imported Usage interface', () => {
    const { program, sourceFile } = loadFixtureProgram('imported_usage_interface.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedImportedUsageInterface);
  });

  it('parses stats collectors, discarding those without schemas', () => {
    const { program, sourceFile } = loadFixtureProgram('stats_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedStatsCollector);
  });

  it('follows `export { Usage } from "./path"` expressions', () => {
    const { program, sourceFile } = loadFixtureProgram('imported_interface_from_export/index.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual(parsedImportedInterfaceFromExport);
  });

  it('skips files that do not define a collector', () => {
    const { program, sourceFile } = loadFixtureProgram('file_with_no_collector.ts');
    const result = [...parseUsageCollection(sourceFile, program)];
    expect(result).toEqual([]);
  });
});
