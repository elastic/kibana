import { getFieldFormat } from '../get_field_format';

const indexPattern = {
  fieldFormatMap: {
    Elastic: {
      type: {
        title: 'string'
      }
    }
  }
};

describe('getFieldFormat', () => {

  it('should handle no arguments', () => {
    expect(getFieldFormat()).toEqual('');
  });

  it('should handle no field name', () => {
    expect(getFieldFormat(indexPattern)).toEqual('');
  });

  it('should handle empty name', () => {
    expect(getFieldFormat(indexPattern, '')).toEqual('');
  });

  it('should handle undefined field name', () => {
    expect(getFieldFormat(indexPattern, 'none')).toEqual(undefined);
  });

  it('should retrieve field format', () => {
    expect(getFieldFormat(indexPattern, 'Elastic')).toEqual('string');
  });
});
