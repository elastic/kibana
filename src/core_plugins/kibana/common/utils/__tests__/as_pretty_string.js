import expect from 'expect.js';
import { asPrettyString } from '../as_pretty_string';

describe('asPrettyString', () => {

  it('Converts null and undefined values into a string signifing no value', () => {
    expect(asPrettyString(null)).to.equal(' - ');
    expect(asPrettyString(undefined)).to.equal(' - ');
  });

  it('Does not mutate string values', () => {
    const s = 'I am a string!@';
    expect(asPrettyString(s)).to.equal(s);
  });

  it('Converts objects values into presentable strings', () => {
    expect(asPrettyString({ key: 'value' })).to.equal('{\n  "key": "value"\n}');
  });

  it('Converts other non-string values into strings', () => {
    expect(asPrettyString(true)).to.equal('true');
    expect(asPrettyString(123)).to.equal('123');
  });

});
