import expect from 'expect.js';
import { FieldFormatsService } from '../field_formats';
import { NumberFormat } from '../types/number';

describe('FieldFormatsService', function () {

  const config = {};
  config['format:defaultTypeMap'] = {
    'ip': { 'id': 'ip', 'params': {} },
    'date': { 'id': 'date', 'params': {} },
    'number': { 'id': 'number', 'params': {} },
    'boolean': { 'id': 'boolean', 'params': {} },
    '_source': { 'id': '_source', 'params': {} },
    '_default_': { 'id': 'string', 'params': {} }
  };
  config['format:number:defaultPattern'] = '0,0.[000]';
  const getConfig = (key) => config[key];

  let fieldFormats;
  beforeEach(function () {
    fieldFormats = new FieldFormatsService;
  });

  it('registered FieldFormats are accessible via getType method', function () {
    fieldFormats.register(NumberFormat);
    const Type = fieldFormats.getType('number');
    expect(Type.id).to.be('number');
  });

  it('getDefaultInstance returns default FieldFormat instance for fieldType', function () {
    fieldFormats.register(NumberFormat);
    const instance = fieldFormats.getDefaultInstance('number', getConfig);
    expect(instance.type.id).to.be('number');
    expect(instance.convert('0.33333')).to.be('0.333');
  });

});
