import expect from 'expect.js';
import { createBytesFormat } from '../bytes';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const BytesFormat = createBytesFormat(FieldFormat);

describe('BytesFormat', function () {

  const config = {};
  config['format:bytes:defaultPattern'] = '0,0.[000]b';
  const getConfig = (key) => config[key];

  it('default pattern', ()=> {
    const formatter = new BytesFormat({}, getConfig);
    expect(formatter.convert(5150000)).to.be('4.911MB');
  });

  it('custom pattern', ()=> {
    const formatter = new BytesFormat({ pattern: '0,0b' }, getConfig);
    expect(formatter.convert('5150000')).to.be('5MB');
  });

});
