import expect from 'expect.js';
import { IpFormat } from '../ip';

describe('IP Address Format', function () {
  let ip;
  beforeEach(function () {
    ip = new IpFormat();
  });

  it('converts a value from a decimal to a string', function () {
    expect(ip.convert(1186489492)).to.be('70.184.100.148');
  });

  it('converts null and undefined to -',  function () {
    expect(ip.convert(null)).to.be('-');
    expect(ip.convert(undefined)).to.be('-');
  });

});
