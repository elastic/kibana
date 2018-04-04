/* eslint import/no-duplicates: 0 */
import { cloneDeep } from 'lodash';
import sinon from 'sinon';

import * as shouldReadFieldFromDocValuesNS from './should_read_field_from_doc_values';
import { shouldReadFieldFromDocValues } from './should_read_field_from_doc_values';

import { getKbnFieldType } from '../../../../../utils';
import { readFieldCapsResponse } from './field_caps_response';
import esResponse from './__fixtures__/es_field_caps_response.json';

describe('index_patterns/field_capabilities/field_caps_response', () => {
  let sandbox;
  beforeEach(() => sandbox = sinon.sandbox.create());
  afterEach(() => sandbox.restore());

  describe('readFieldCapsResponse()', () => {
    describe('conflicts', () => {
      it('returns a field for each in response, no filtering', () => {
        const fields = readFieldCapsResponse(esResponse);
        expect(fields).toHaveLength(19);
      });

      it('includes only name, type, searchable, aggregatable, readFromDocValues, and maybe conflictDescriptions of each field', () => {
        const responseClone = cloneDeep(esResponse);
        // try to trick it into including an extra field
        responseClone.fields['@timestamp'].date.extraCapability = true;
        const fields = readFieldCapsResponse(responseClone);

        fields.forEach(field => {
          if (field.conflictDescriptions) {
            delete field.conflictDescriptions;
          }

          expect(Object.keys(field)).toEqual([
            'name',
            'type',
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
        sinon.assert.callCount(shouldReadFieldFromDocValues, fields.length - conflictCount);
      });

      it('converts es types to kibana types', () => {
        readFieldCapsResponse(esResponse).forEach(field => {
          if (!getKbnFieldType(field.type)) {
            throw new Error(`expected field to have kibana type, got ${field.type}`);
          }
        });
      });

      it('returns fields with multiple types as conflicts', () => {
        const fields = readFieldCapsResponse(esResponse);
        const conflicts = fields.filter(f => f.type === 'conflict');
        expect(conflicts).toEqual([
          {
            name: 'success',
            type: 'conflict',
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
    });
  });
});
