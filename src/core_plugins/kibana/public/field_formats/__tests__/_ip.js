import expect from 'expect.js';
import { fieldFormats } from 'ui/registry/field_formats';
describe('IP Address Format', function () {

  const ip = fieldFormats.getInstance('ip');

  it('converts a value from a decimal to a string', function () {
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

  it('converts null and undefined to -',  function () {
    expect(ip.convert(null)).to.be('-');
    expect(ip.convert(undefined)).to.be('-');
  });

});
