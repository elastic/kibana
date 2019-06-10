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
import { patternToIngest, ingestToPattern } from '../convert_pattern_and_ingest_name';

describe('convertPatternAndTemplateName', function () {

  describe('ingestToPattern', function () {

    it('should convert an index template\'s name to its matching index pattern\'s title', function () {
      expect(ingestToPattern('kibana-logstash-*')).to.be('logstash-*');
    });

    it('should throw an error if the template name isn\'t a valid kibana namespaced name', function () {
      expect(ingestToPattern).withArgs('logstash-*').to.throwException('not a valid kibana namespaced template name');
      expect(ingestToPattern).withArgs('').to.throwException(/not a valid kibana namespaced template name/);
    });

  });

  describe('patternToIngest', function () {

    it('should convert an index pattern\'s title to its matching index template\'s name', function () {
      expect(patternToIngest('logstash-*')).to.be('kibana-logstash-*');
    });

    it('should throw an error if the pattern is empty', function () {
      expect(patternToIngest).withArgs('').to.throwException(/pattern must not be empty/);
    });

  });

});
