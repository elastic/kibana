import expect from 'expect.js';
import { FieldFormatsService } from '../field_formats_service';
import { NumberFormat } from '../../../core_plugins/kibana/common/field_formats/types/number';

describe('FieldFormatsService', function () {

  const config = {};
  config['format:defaultTypeMap'] = {
    'number': { 'id': 'number', 'params': {} },
    '_default_': { 'id': 'string', 'params': {} }
  };
  config['format:number:defaultPattern'] = '0,0.[000]';
  const getConfig = (key) => config[key];
  const fieldFormatClasses = [NumberFormat];

  let fieldFormats;
  beforeEach(function () {
    fieldFormats = new FieldFormatsService(fieldFormatClasses, getConfig);
  });

  it('FieldFormats are accessible via getType method', function () {
    const Type = fieldFormats.getType('number');
    expect(Type.id).to.be('number');
  });

  it('getDefaultInstance returns default FieldFormat instance for fieldType', function () {
    const instance = fieldFormats.getDefaultInstance('number', getConfig);
    expect(instance.type.id).to.be('number');
    expect(instance.convert('0.33333')).to.be('0.333');
  });

});
