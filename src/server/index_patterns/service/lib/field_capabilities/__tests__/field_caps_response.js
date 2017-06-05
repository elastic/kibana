import { cloneDeep } from 'lodash';
import expect from 'expect.js';
import sinon from 'sinon';

import * as shouldReadFieldFromDocValuesNS from '../should_read_field_from_doc_values';
import { shouldReadFieldFromDocValues } from '../should_read_field_from_doc_values';

import { getKbnFieldType } from '../../../../../../utils';
import { readFieldCapsResponse } from '../field_caps_response';
import esResponse from './fixtures/es_field_caps_response.json';

describe('index_patterns/field_capabilities/field_caps_response', () => {
  let sandbox;
  beforeEach(() => sandbox = sinon.sandbox.create());
  afterEach(() => sandbox.restore());

  describe('readFieldCapsResponse()', () => {
    describe('conflicts', () => {
      it('returns a field for each in response, no filtering', () => {
        const fields = readFieldCapsResponse(esResponse);
        expect(fields).to.have.length(13);
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

          expect(Object.keys(field)).to.eql([
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
        expect(conflicts).to.eql([
          {
            name: 'success',
            type: 'conflict',
            searchable: false,
            aggregatable: false,
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
    });
  });
});
