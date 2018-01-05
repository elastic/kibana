import expect from 'expect.js';
import moment from 'moment-timezone';
import { createRelativeDateFormat } from '../relative_date';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const RelativeDateFormat = createRelativeDateFormat(FieldFormat);

describe('Relative Date Format', function () {
  let convert;

  beforeEach(function () {
    const relativeDate = new RelativeDateFormat({});
    convert = relativeDate.convert.bind(relativeDate);
  });

  it('decoding an undefined or null date should return a "-"', function () {
    expect(convert(null)).to.be('-');
    expect(convert(undefined)).to.be('-');
  });

  it('decoding invalid date should echo invalid value', function () {
    expect(convert('not a valid date')).to.be('not a valid date');
  });

  it('should parse date values', function () {
    const val = '2017-08-13T20:24:09.904Z';
    expect(convert(val)).to.be(moment(val).fromNow());
  });
});
