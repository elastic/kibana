/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import * as ts from 'typescript';
import { parsedWorkingCollector } from './__fixture__/parsed_working_collector';
import { parsedIndexedInterfaceWithNoMatchingSchema } from './__fixture__/parsed_indexed_interface_with_not_matching_schema';
import { checkCompatibleTypeDescriptor, checkMatchingMapping } from './check_collector_integrity';
import * as path from 'path';
import { readFile } from 'fs';
import { promisify } from 'util';
const read = promisify(readFile);

async function parseJsonFile(relativePath: string) {
  const schemaPath = path.resolve(__dirname, '__fixture__', relativePath);
  const fileContent = await read(schemaPath, 'utf8');
  return JSON.parse(fileContent);
}

describe('checkMatchingMapping', () => {
  it('returns no diff on matching parsedCollections and stored mapping', async () => {
    const mockSchema = await parseJsonFile('mock_schema.json');
    const diffs = checkMatchingMapping([parsedWorkingCollector], mockSchema);
    expect(diffs).toEqual({});
  });

  describe('Collector change', () => {
    it('returns diff on mismatching parsedCollections and stored mapping', async () => {
      const mockSchema = await parseJsonFile('mock_schema.json');
      const malformedParsedCollector = cloneDeep(parsedWorkingCollector);
      const fieldMapping = { type: 'long' };
      malformedParsedCollector[1].schema.value.flat = fieldMapping;

      const diffs = checkMatchingMapping([malformedParsedCollector], mockSchema);
      expect(diffs).toEqual({
        properties: {
          my_working_collector: {
            properties: { flat: fieldMapping },
          },
        },
      });
    });

    it('returns diff on unknown parsedCollections', async () => {
      const mockSchema = await parseJsonFile('mock_schema.json');
      const malformedParsedCollector = cloneDeep(parsedWorkingCollector);
      const collectorName = 'New Collector in town!';
      const collectorMapping = { some_usage: { type: 'long' } };
      malformedParsedCollector[1].collectorName = collectorName;
      malformedParsedCollector[1].schema.value = { some_usage: { type: 'long' } };

      const diffs = checkMatchingMapping([malformedParsedCollector], mockSchema);
      expect(diffs).toEqual({
        properties: {
          [collectorName]: {
            properties: collectorMapping,
          },
        },
      });
    });
  });
});

describe('checkCompatibleTypeDescriptor', () => {
  it('returns no diff on compatible type descriptor with mapping', () => {
    const incompatibles = checkCompatibleTypeDescriptor([parsedWorkingCollector]);
    expect(incompatibles).toHaveLength(0);
  });

  it('returns diff on indexed interface with no matching schema', () => {
    const incompatibles = checkCompatibleTypeDescriptor([
      parsedIndexedInterfaceWithNoMatchingSchema,
    ]);
    expect(incompatibles).toHaveLength(1);
    const { diff, message } = incompatibles[0];
    // eslint-disable-next-line @typescript-eslint/naming-convention
    expect(diff).toEqual({ '@@INDEX@@.count_2.kind': 'number' });
    expect(message).toHaveLength(1);
    expect(message).toEqual([
      'incompatible Type key (Usage.@@INDEX@@.count_2): expected (undefined) got ("number").',
    ]);
  });

  describe('Interface Change', () => {
    it('returns diff on incompatible type descriptor with mapping', () => {
      const malformedParsedCollector = cloneDeep(parsedWorkingCollector);
      malformedParsedCollector[1].fetch.typeDescriptor.flat.kind = ts.SyntaxKind.BooleanKeyword;
      const incompatibles = checkCompatibleTypeDescriptor([malformedParsedCollector]);
      expect(incompatibles).toHaveLength(1);
      const { diff, message } = incompatibles[0];
      expect(diff).toEqual({ 'flat.kind': 'boolean' });
      expect(message).toHaveLength(1);
      expect(message).toEqual([
        'incompatible Type key (Usage.flat): expected ("string") got ("boolean").',
      ]);
    });

    it.todo('returns diff when missing type descriptor');
  });

  describe('Mapping change', () => {
    it('returns no diff when mapping change between text and keyword', () => {
      const malformedParsedCollector = cloneDeep(parsedWorkingCollector);
      malformedParsedCollector[1].schema.value.flat.type = 'text';
      const incompatibles = checkCompatibleTypeDescriptor([malformedParsedCollector]);
      expect(incompatibles).toHaveLength(0);
    });

    it('returns diff on incompatible type descriptor with mapping', () => {
      const malformedParsedCollector = cloneDeep(parsedWorkingCollector);
      malformedParsedCollector[1].schema.value.flat.type = 'boolean';
      const incompatibles = checkCompatibleTypeDescriptor([malformedParsedCollector]);
      expect(incompatibles).toHaveLength(1);
      const { diff, message } = incompatibles[0];
      expect(diff).toEqual({ 'flat.kind': 'string' });
      expect(message).toHaveLength(1);
      expect(message).toEqual([
        'incompatible Type key (Usage.flat): expected ("boolean") got ("string").',
      ]);
    });

    it.todo('returns diff when missing mapping');
  });
});
