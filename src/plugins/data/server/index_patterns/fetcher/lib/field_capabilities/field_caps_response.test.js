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

/* eslint import/no-duplicates: 0 */
import { cloneDeep, omit } from 'lodash';
import sinon from 'sinon';

import * as shouldReadFieldFromDocValuesNS from './should_read_field_from_doc_values';
import { shouldReadFieldFromDocValues } from './should_read_field_from_doc_values';

import { getKbnFieldType } from '../../../../../../data/server';
import { readFieldCapsResponse } from './field_caps_response';
import esResponse from './__fixtures__/es_field_caps_response.json';

describe('index_patterns/field_capabilities/field_caps_response', () => {
  let sandbox;
  beforeEach(() => sandbox = sinon.createSandbox());
  afterEach(() => sandbox.restore());

  describe('readFieldCapsResponse()', () => {
    describe('conflicts', () => {
      it('returns a field for each in response, no filtering', () => {
        const fields = readFieldCapsResponse(esResponse);
        expect(fields).toHaveLength(24);
      });

      it('includes only name, type, esTypes, searchable, aggregatable, readFromDocValues, and maybe conflictDescriptions, ' +
        'and subType of each field', () => {
        const responseClone = cloneDeep(esResponse);
        // try to trick it into including an extra field
        responseClone.fields['@timestamp'].date.extraCapability = true;
        const fields = readFieldCapsResponse(responseClone);

        fields.forEach(field => {
          const fieldWithoutOptionalKeys = omit(field, 'conflictDescriptions', 'subType');

          expect(Object.keys(fieldWithoutOptionalKeys)).toEqual([
            'name',
            'type',
            'esTypes',
            'searchable',
            'aggregatable',
            'readFromDocValues'
          ]);
        });
      });

      it('calls shouldReadFieldFromDocValues() for each non-conflict field', () => {
        sandbox.spy(shouldReadFieldFromDocValuesNS, 'shouldReadFieldFromDocValues');
        const fields = readFieldCapsResponse(esResponse);
        const conflictCount = fields.filter(f => f.type === 'conflict').length;
        // +2 is for the object and nested fields which get filtered out of the final return value from readFieldCapsResponse
        sinon.assert.callCount(shouldReadFieldFromDocValues, fields.length - conflictCount + 2);
      });

      it('converts es types to kibana types', () => {
        readFieldCapsResponse(esResponse).forEach(field => {
          if (!getKbnFieldType(field.type)) {
            throw new Error(`expected field to have kibana type, got ${field.type}`);
          }
        });
      });

      it('should include the original ES types found for each field across indices', () => {
        const fields = readFieldCapsResponse(esResponse);
        fields.forEach((field) => {
          const fixtureTypes = Object.keys(esResponse.fields[field.name]);
          expect(field.esTypes).toEqual(fixtureTypes);
        });
      });

      it('returns fields with multiple types as conflicts', () => {
        const fields = readFieldCapsResponse(esResponse);
        const conflicts = fields.filter(f => f.type === 'conflict');
        expect(conflicts).toEqual([
          {
            name: 'success',
            type: 'conflict',
            esTypes: ['boolean', 'keyword'],
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
            conflictDescriptions: {
              boolean: [
                'index1'
              ],
              keyword: [
                'index2'
              ]
            }
          }
        ]);
      });

      it('does not return conflicted fields if the types are resolvable to the same kibana type', () => {
        const fields = readFieldCapsResponse(esResponse);
        const resolvableToString = fields.find(f => f.name === 'resolvable_to_string');
        const resolvableToNumber = fields.find(f => f.name === 'resolvable_to_number');
        expect(resolvableToString.type).toBe('string');
        expect(resolvableToNumber.type).toBe('number');
      });

      it('returns aggregatable if at least one field is aggregatable', () => {
        const fields = readFieldCapsResponse(esResponse);
        const mixAggregatable = fields.find(f => f.name === 'mix_aggregatable');
        const mixAggregatableOther = fields.find(f => f.name === 'mix_aggregatable_other');
        expect(mixAggregatable.aggregatable).toBe(true);
        expect(mixAggregatableOther.aggregatable).toBe(true);
      });

      it('returns searchable if at least one field is searchable', () => {
        const fields = readFieldCapsResponse(esResponse);
        const mixSearchable = fields.find(f => f.name === 'mix_searchable');
        const mixSearchableOther = fields.find(f => f.name === 'mix_searchable_other');
        expect(mixSearchable.searchable).toBe(true);
        expect(mixSearchableOther.searchable).toBe(true);
      });

      it('returns multi fields with a subType key describing the relationship', () => {
        const fields = readFieldCapsResponse(esResponse);
        const child = fields.find(f => f.name === 'multi_parent.child');
        expect(child).toHaveProperty('subType', { multi: { parent: 'multi_parent' } });
      });

      it('returns nested sub-fields with a subType key describing the relationship', () => {
        const fields = readFieldCapsResponse(esResponse);
        const child = fields.find(f => f.name === 'nested_object_parent.child');
        expect(child).toHaveProperty('subType', { nested: { path: 'nested_object_parent' } });
      });

      it('returns nested sub-fields as non-aggregatable', () => {
        const fields = readFieldCapsResponse(esResponse);
        // Normally a keyword field would be aggregatable, but the fact that it is nested overrides that
        const child = fields.find(f => f.name === 'nested_object_parent.child.keyword');
        expect(child).toHaveProperty('aggregatable', false);
      });

      it('handles fields that are both nested and multi', () => {
        const fields = readFieldCapsResponse(esResponse);
        const child = fields.find(f => f.name === 'nested_object_parent.child.keyword');
        expect(child).toHaveProperty(
          'subType',
          {
            nested: { path: 'nested_object_parent' },
            multi: { parent: 'nested_object_parent.child' }
          });
      });

      it('does not include the field actually mapped as nested itself', () => {
        const fields = readFieldCapsResponse(esResponse);
        const child = fields.find(f => f.name === 'nested_object_parent');
        expect(child).toBeUndefined();
      });

      it('should not confuse object children for multi or nested field children', () => {
        // We detect multi fields by finding fields that have a dot in their name and then looking
        // to see if their parents are *not* object fields. In the future we may want to
        // add subType info for object fields but for now we don't need it.
        const fields = readFieldCapsResponse(esResponse);
        const child = fields.find(f => f.name === 'object_parent.child');
        expect(child).not.toHaveProperty('subType');
      });
    });
  });
});
