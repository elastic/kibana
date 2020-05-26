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

import * as _ from 'lodash';
import * as ts from 'typescript';
import esMapping from './__fixture__/mock_mapping.json';
import { parsedWorkingCollector } from './__fixture__/parsed_working_collector';
import { checkCompatibleTypeDescriptor, checkMatchingMapping } from './check_collector_integrity';

describe('checkMatchingMapping', () => {
  it('returns no diff on matching parsedCollections and stored mapping', () => {
    const diffs = checkMatchingMapping([parsedWorkingCollector], esMapping);
    expect(diffs).toEqual({});
  });

  describe('Collector change', () => {
    it('returns diff on mismatching parsedCollections and stored mapping', () => {
      const malformedParsedCollector = _.cloneDeep(parsedWorkingCollector);
      const fieldMapping = { type: 'number' };
      malformedParsedCollector[1].mapping.value.flat = fieldMapping;

      const diffs = checkMatchingMapping([malformedParsedCollector], esMapping);
      expect(diffs).toEqual({
        properties: {
          my_working_collector: {
            properties: { flat: fieldMapping },
          },
        },
      });
    });

    it('returns diff on unknown parsedCollections', () => {
      const malformedParsedCollector = _.cloneDeep(parsedWorkingCollector);
      const collectorName = 'New Collector in town!';
      const collectorMapping = { some_usage: { type: 'number' } };
      malformedParsedCollector[1].collectorName = collectorName;
      malformedParsedCollector[1].mapping.value = { some_usage: { type: 'number' } };

      const diffs = checkMatchingMapping([malformedParsedCollector], esMapping);
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
    expect(incompatibles).toHaveLength(1);
    const { diff, message } = incompatibles[0];
    expect(diff).toEqual({});
    expect(message).toHaveLength(0);
  });

  describe('Interface Change', () => {
    it('returns diff on incompatible type descriptor with mapping', () => {
      const malformedParsedCollector = _.cloneDeep(parsedWorkingCollector);
      malformedParsedCollector[1].fetch.typeDescriptor.flat.kind = ts.SyntaxKind.BooleanKeyword;
      const incompatibles = checkCompatibleTypeDescriptor([malformedParsedCollector]);
      expect(incompatibles).toHaveLength(1);
      const { diff, message } = incompatibles[0];
      expect(diff).toEqual({ 'flat.kind': ts.SyntaxKind.BooleanKeyword });
      expect(message).toHaveLength(1);
      expect(message).toEqual([
        'incompatible Type key (Usage.flat): expected (string) got (boolean).',
      ]);
    });

    it.todo('returns diff when missing type descriptor');
  });

  describe('Mapping change', () => {
    it('returns no diff when mapping change between text and keyword', () => {
      const malformedParsedCollector = _.cloneDeep(parsedWorkingCollector);
      malformedParsedCollector[1].mapping.value.flat.type = 'text';
      const incompatibles = checkCompatibleTypeDescriptor([malformedParsedCollector]);
      expect(incompatibles).toHaveLength(1);
      const { diff, message } = incompatibles[0];
      expect(diff).toEqual({});
      expect(message).toHaveLength(0);
    });

    it('returns diff on incompatible type descriptor with mapping', () => {
      const malformedParsedCollector = _.cloneDeep(parsedWorkingCollector);
      malformedParsedCollector[1].mapping.value.flat.type = 'boolean';
      const incompatibles = checkCompatibleTypeDescriptor([malformedParsedCollector]);
      expect(incompatibles).toHaveLength(1);
      const { diff, message } = incompatibles[0];
      expect(diff).toEqual({ 'flat.kind': ts.SyntaxKind.StringKeyword });
      expect(message).toHaveLength(1);
      expect(message).toEqual([
        'incompatible Type key (Usage.flat): expected (boolean) got (string).',
      ]);
    });

    it.todo('returns diff when missing mapping');
  });
});
