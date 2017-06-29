import expect from 'expect.js';
import { stringifyTruncate } from '../truncate';

describe('String Truncate Format', function () {
  let Truncate;

  beforeEach(function () {
    Truncate = stringifyTruncate();
  });

  it('truncate large string', function () {
    const truncate = new Truncate({ fieldLength: 4 });

    expect(truncate.convert('This is some text')).to.be('This...');
  });

  it('does not truncate large string when field length is not a string', function () {
    const truncate = new Truncate({ fieldLength: 'not number' });

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });

  it('does not truncate large string when field length is null', function () {
    const truncate = new Truncate({ fieldLength: null });

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });

  it('does not truncate large string when field length larger than the text', function () {
    const truncate = new Truncate({ fieldLength: 100000 });

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });
});
