import expect from 'expect.js';
import { createBoolFormat } from '../boolean';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const BoolFormat = createBoolFormat(FieldFormat);

describe('Boolean Format', function () {

  let boolean;
  beforeEach(() => {
    boolean = new BoolFormat();
  });

  [
    {
      input: 0,
      expected: 'false'
    },
    {
      input: 'no',
      expected: 'false'
    },
    {
      input: false,
      expected: 'false'
    },
    {
      input: 'false',
      expected: 'false'
    },
    {
      input: 1,
      expected: 'true'
    },
    {
      input: 'yes',
      expected: 'true'
    },
    {
      input: true,
      expected: 'true'
    },
    {
      input: 'true',
      expected: 'true'
    },
    {
      input: ' True  ', //should handle trailing and mixed case
      expected: 'true'
    }
  ].forEach((test)=> {
    it(`convert ${test.input} to boolean`, ()=> {
      expect(boolean.convert(test.input)).to.be(test.expected);
    });
  });

  it('does not convert non-boolean values, instead returning original value', ()=> {
    const s = 'non-boolean value!!';
    expect(boolean.convert(s)).to.be(s);
  });

});
