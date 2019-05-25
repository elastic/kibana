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
import { createDurationFormat } from '../duration';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const DurationFormat = createDurationFormat(FieldFormat);

describe('Duration Format', function () {

  test({
    inputFormat: 'seconds',
    outputFormat: 'humanize',
    fixtures: [
      {
        input: -60,
        output: 'minus a minute'
      },
      {
        input: 60,
        output: 'a minute'
      },
      {
        input: 125,
        output: '2 minutes'
      }
    ]
  });

  test({
    inputFormat: 'minutes',
    outputFormat: 'humanize',
    fixtures: [
      {
        input: -60,
        output: 'minus an hour'
      },
      {
        input: 60,
        output: 'an hour'
      },
      {
        input: 125,
        output: '2 hours'
      }
    ]
  });

  test({
    inputFormat: 'minutes',
    outputFormat: 'asHours',
    fixtures: [
      {
        input: -60,
        output: '-1.00'
      },
      {
        input: 60,
        output: '1.00'
      },
      {
        input: 125,
        output: '2.08'
      }
    ]
  });

  test({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 0,
    fixtures: [
      {
        input: -60,
        output: '-60'
      },
      {
        input: 60,
        output: '60'
      },
      {
        input: 125,
        output: '125'
      }
    ]
  });

  test({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 2,
    fixtures: [
      {
        input: -60,
        output: '-60.00'
      },
      {
        input: -32.333,
        output: '-32.33'
      },
      {
        input: 60,
        output: '60.00'
      },
      {
        input: 125,
        output: '125.00'
      }
    ]
  });

  function test({ inputFormat, outputFormat, outputPrecision, fixtures }) {
    fixtures.forEach((fixture) => {
      const input = fixture.input;
      const output = fixture.output;
      it(`should format ${input} ${inputFormat} through ${outputFormat}${outputPrecision ? `, ${outputPrecision} decimals` : ''}`, () => {
        const duration = new DurationFormat({ inputFormat, outputFormat, outputPrecision });
        expect(duration.convert(input)).to.eql(output);
      });
    });
  }
});
