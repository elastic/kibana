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
import ngMock from 'ng_mock';
import moment from 'moment-timezone';
import { fieldFormats } from 'ui/registry/field_formats';
describe('Date Format', function() {
  let settings;
  let convert;
  let $scope;
  let off;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(config, $rootScope) {
      $scope = $rootScope;
      settings = config;

      const getConfig = (...args) => config.get(...args);
      const DateFormat = fieldFormats.getType('date');
      const date = new DateFormat({}, getConfig);

      convert = date.convert.bind(date);
    })
  );

  it('decoding an undefined or null date should return an empty string', function() {
    expect(convert(null)).to.be('-');
    expect(convert(undefined)).to.be('-');
  });

  it('should clear the memoization cache after changing the date', function() {
    function setDefaultTimezone() {
      moment.tz.setDefault(settings.get('dateFormat:tz'));
    }
    const time = 1445027693942;

    off = $scope.$on('change:config.dateFormat:tz', setDefaultTimezone);

    settings.set('dateFormat:tz', 'America/Chicago');
    $scope.$digest();
    const chicagoTime = convert(time);

    settings.set('dateFormat:tz', 'America/Phoenix');
    $scope.$digest();
    const phoenixTime = convert(time);

    expect(chicagoTime).not.to.equal(phoenixTime);
    off();
  });

  it('should return the value itself when it cannot successfully be formatted', function() {
    const dateMath = 'now+1M/d';
    expect(convert(dateMath)).to.be(dateMath);
  });
});
