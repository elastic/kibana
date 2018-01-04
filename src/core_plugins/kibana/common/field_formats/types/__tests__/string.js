import expect from 'expect.js';
import { createStringFormat } from '../string';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const StringFormat = createStringFormat(FieldFormat);

describe('String Format', function () {

  it('convert a string to lower case', function () {
    const string = new StringFormat({
      transform: 'lower'
    });
    expect(string.convert('Kibana')).to.be('kibana');
  });

  it('convert a string to upper case', function () {
    const string = new StringFormat({
      transform: 'upper'
    });
    expect(string.convert('Kibana')).to.be('KIBANA');
  });

  it('decode a base64 string', function () {
    const string = new StringFormat({
      transform: 'base64'
    });
    expect(string.convert('Zm9vYmFy')).to.be('foobar');
  });

  it('convert a string to title case', function () {
    const string = new StringFormat({
      transform: 'title'
    });
    expect(string.convert('PLEASE DO NOT SHOUT')).to.be('Please Do Not Shout');
    expect(string.convert('Mean, variance and standard_deviation.')).to.be('Mean, Variance And Standard_deviation.');
    expect(string.convert('Stay CALM!')).to.be('Stay Calm!');
  });

  it('convert a string to short case', function () {
    const string = new StringFormat({
      transform: 'short'
    });
    expect(string.convert('dot.notated.string')).to.be('d.n.string');
  });

  it('convert a string to unknown transform case', function () {
    const string = new StringFormat({
      transform: 'unknown_transform'
    });
    const value = 'test test test';
    expect(string.convert(value)).to.be(value);
  });

});
