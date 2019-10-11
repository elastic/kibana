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

import isEsCompatibleWithKibana from '../is_es_compatible_with_kibana';

describe('plugins/elasticsearch', () => {
  describe('lib/is_es_compatible_with_kibana', () => {
    describe('returns false', () => {
      it('when ES major is greater than Kibana major', () => {
        expect(isEsCompatibleWithKibana('1.0.0', '0.0.0')).to.be(false);
      });

      it('when ES major is less than Kibana major', () => {
        expect(isEsCompatibleWithKibana('0.0.0', '1.0.0')).to.be(false);
      });

      it('when majors are equal, but ES minor is less than Kibana minor', () => {
        expect(isEsCompatibleWithKibana('1.0.0', '1.1.0')).to.be(false);
      });
    });

    describe('returns true', () => {
      it('when version numbers are the same', () => {
        expect(isEsCompatibleWithKibana('1.1.1', '1.1.1')).to.be(true);
      });

      it('when majors are equal, and ES minor is greater than Kibana minor', () => {
        expect(isEsCompatibleWithKibana('1.1.0', '1.0.0')).to.be(true);
      });

      it('when majors and minors are equal, and ES patch is greater than Kibana patch', () => {
        expect(isEsCompatibleWithKibana('1.1.1', '1.1.0')).to.be(true);
      });

      it('when majors and minors are equal, but ES patch is less than Kibana patch', () => {
        expect(isEsCompatibleWithKibana('1.1.0', '1.1.1')).to.be(true);
      });
    });
  });
});
