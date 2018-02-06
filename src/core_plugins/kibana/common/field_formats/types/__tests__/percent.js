import expect from 'expect.js';
import { createPercentFormat } from '../percent';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const PercentFormat = createPercentFormat(FieldFormat);

describe('PercentFormat', function () {

  const config = {};
  config['format:percent:defaultPattern'] = '0,0.[000]%';
  const getConfig = (key) => config[key];

  it('default pattern', ()=> {
    const formatter = new PercentFormat({}, getConfig);
    expect(formatter.convert(0.99999)).to.be('99.999%');
  });

  it('custom pattern', ()=> {
    const formatter = new PercentFormat({ pattern: '0,0%' }, getConfig);
    expect(formatter.convert('0.99999')).to.be('100%');
  });

});
