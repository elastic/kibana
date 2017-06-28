import expect from 'expect.js';
import { shortenDottedString } from '../shorten_dotted_string';

describe('shortenDottedString', () => {

  it('Convert a dot.notated.string into a short string', () => {
    expect(shortenDottedString('dot.notated.string')).to.equal('d.n.string');
  });

  it('Ignores non-string values', () => {
    expect(shortenDottedString(true)).to.equal(true);
    expect(shortenDottedString(123)).to.equal(123);
    const obj = { key: 'val' };
    expect(shortenDottedString(obj)).to.equal(obj);
  });

});
