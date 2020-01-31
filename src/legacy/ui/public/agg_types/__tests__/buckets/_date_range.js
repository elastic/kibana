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
import { set } from 'lodash';
import expect from '@kbn/expect';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { aggTypes } from '../..';
import AggParamWriterProvider from '../agg_param_writer';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import chrome from '../../../chrome';

const config = chrome.getUiSettingsClient();

describe('date_range params', function() {
  let paramWriter;
  let timeField;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function(Private) {
      const AggParamWriter = Private(AggParamWriterProvider);
      const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

      timeField = indexPattern.timeFieldName;
      paramWriter = new AggParamWriter({ aggType: 'date_range' });
    })
  );

  describe('getKey', () => {
    const dateRange = aggTypes.buckets.find(agg => agg.name === 'date_range');
    it('should return object', () => {
      const bucket = { from: 'from-date', to: 'to-date', key: 'from-dateto-date' };
      expect(dateRange.getKey(bucket)).to.equal({ from: 'from-date', to: 'to-date' });
    });
  });

  describe('time_zone', () => {
    beforeEach(() => {
      sinon.stub(config, 'get');
      sinon.stub(config, 'isDefault');
    });

    it('should use the specified time_zone', () => {
      const output = paramWriter.write({ time_zone: 'Europe/Kiev' });
      expect(output.params).to.have.property('time_zone', 'Europe/Kiev');
    });

    it('should use the Kibana time_zone if no parameter specified', () => {
      config.isDefault.withArgs('dateFormat:tz').returns(false);
      config.get.withArgs('dateFormat:tz').returns('Europe/Riga');
      const output = paramWriter.write({});
      expect(output.params).to.have.property('time_zone', 'Europe/Riga');
    });

    it('should use the fixed time_zone from the index pattern typeMeta', () => {
      set(
        paramWriter.indexPattern,
        ['typeMeta', 'aggs', 'date_range', timeField, 'time_zone'],
        'Europe/Rome'
      );
      const output = paramWriter.write({ field: timeField });
      expect(output.params).to.have.property('time_zone', 'Europe/Rome');
    });

    afterEach(() => {
      config.get.restore();
      config.isDefault.restore();
    });
  });
});
