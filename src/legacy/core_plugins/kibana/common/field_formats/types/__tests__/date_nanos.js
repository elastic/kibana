/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import moment from 'moment-timezone';
import { createDateNanosFormat, analysePatternForFract, formatWithNanos } from '../date_nanos';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const DateFormat = createDateNanosFormat(FieldFormat);

describe('Date Nanos Format', function () {
  let convert;
  let mockConfig;

  beforeEach(function () {
    mockConfig = {};
    mockConfig.dateNanosFormat = 'MMMM Do YYYY, HH:mm:ss.SSSSSSSSS';
    mockConfig['dateFormat:tz'] = 'Browser';
    const getConfig = (key) => mockConfig[key];
    const date = new DateFormat({}, getConfig);

    convert = date.convert.bind(date);
  });


  it('should inject fractional seconds into formatted timestamp', function () {
    [{
      input: '2019-05-20T14:04:56.357001234Z',
      pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
      expected: 'May 20, 2019 @ 14:04:56.357001234',
    }, {
      input: '2019-05-05T14:04:56.357111234Z',
      pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
      expected: 'May 5, 2019 @ 14:04:56.357111234',
    }, {
      input: '2019-05-05T14:04:56.357Z',
      pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
      expected: 'May 5, 2019 @ 14:04:56.357000000',
    }, {
      input: '2019-05-05T14:04:56Z',
      pattern: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
      expected: 'May 5, 2019 @ 14:04:56.000000000',
    }, {
      input: '2019-05-05T14:04:56.201900001Z',
      pattern: 'MMM D, YYYY @ HH:mm:ss SSSS',
      expected: 'May 5, 2019 @ 14:04:56 2019',
    }, {
      input: '2019-05-05T14:04:56.201900001Z',
      pattern: 'SSSSSSSSS',
      expected: '201900001',
    }].forEach(fixture => {
      const fracPattern = analysePatternForFract(fixture.pattern);
      const momentDate = moment(fixture.input).utc();
      const value = formatWithNanos(momentDate, fixture.input, fracPattern);
      expect(value).to.be(fixture.expected);
    });
  });

  it('decoding an undefined or null date should return an empty string', function () {
    expect(convert(null)).to.be('-');
    expect(convert(undefined)).to.be('-');
  });

  it('should clear the memoization cache after changing the date', function () {
    function setDefaultTimezone() {
      moment.tz.setDefault(mockConfig['dateFormat:tz']);
    }

    const dateTime = '2019-05-05T14:04:56.201900001Z';

    mockConfig['dateFormat:tz'] = 'America/Chicago';
    setDefaultTimezone();
    const chicagoTime = convert(dateTime);

    mockConfig['dateFormat:tz'] = 'America/Phoenix';
    setDefaultTimezone();
    const phoenixTime = convert(dateTime);

    expect(chicagoTime).not.to.equal(phoenixTime);
  });

  it('should return the value itself when it cannot successfully be formatted', function () {
    const dateMath = 'now+1M/d';
    expect(convert(dateMath)).to.be(dateMath);
  });
});
