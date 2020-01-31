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
import { fieldFormats } from 'ui/registry/field_formats';

describe('Duration Format', function() {
  const DurationFormat = fieldFormats.getType('duration');

  test({ inputFormat: 'seconds', outputFormat: 'humanize' })(-60, 'minus a minute')(60, 'a minute')(
    125,
    '2 minutes'
  );

  test({ inputFormat: 'minutes', outputFormat: 'humanize' })(-60, 'minus an hour')(60, 'an hour')(
    125,
    '2 hours'
  );

  test({ inputFormat: 'minutes', outputFormat: 'asHours' })(
    // outputPrecision defaults to: 2
    -60,
    '-1.00'
  )(60, '1.00')(125, '2.08');

  test({ inputFormat: 'seconds', outputFormat: 'asSeconds', outputPrecision: 0 })(-60, '-60')(
    60,
    '60'
  )(125, '125');

  test({ inputFormat: 'seconds', outputFormat: 'asSeconds', outputPrecision: 2 })(-60, '-60.00')(
    -32.333,
    '-32.33'
  )(60, '60.00')(125, '125.00');

  function test({ inputFormat, outputFormat, outputPrecision }) {
    return function testFixture(input, output) {
      it(`should format ${input} ${inputFormat} through ${outputFormat}${
        outputPrecision ? `, ${outputPrecision} decimals` : ''
      }`, () => {
        const duration = new DurationFormat({ inputFormat, outputFormat, outputPrecision });
        expect(duration.convert(input)).to.eql(output);
      });
      return testFixture;
    };
  }
});
