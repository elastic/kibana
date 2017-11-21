import expect from 'expect.js';
import { createTruncateFormat } from '../truncate';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const TruncateFormat = createTruncateFormat(FieldFormat);

describe('String TruncateFormat', function () {

  it('truncate large string', function () {
    const truncate = new TruncateFormat({ fieldLength: 4 });

    expect(truncate.convert('This is some text')).to.be('This...');
  });

  it('does not truncate large string when field length is not a string', function () {
    const truncate = new TruncateFormat({ fieldLength: 'not number' });

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });

  it('does not truncate large string when field length is null', function () {
    const truncate = new TruncateFormat({ fieldLength: null });

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });

  it('does not truncate large string when field length larger than the text', function () {
    const truncate = new TruncateFormat({ fieldLength: 100000 });

    expect(truncate.convert('This is some text')).to.be('This is some text');
  });
});
