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
import { BaseVisType } from '../../vis_types/base_vis_type';

describe('Base Vis Type', function () {
  beforeEach(ngMock.module('kibana'));

  describe('initialization', () => {
    it('should throw if mandatory properties are missing', () => {
      expect(() => {
        new BaseVisType({});
      }).to.throwError('vis_type must define its name');

      expect(() => {
        new BaseVisType({ name: 'test' });
      }).to.throwError('vis_type must define its title');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test' });
      }).to.throwError('vis_type must define its description');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test', description: 'test' });
      }).to.throwError('vis_type must define its icon or image');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test', description: 'test', icon: 'test' });
      }).to.throwError('vis_type must define visualization controller');

      expect(() => {
        new BaseVisType({ name: 'test', title: 'test', description: 'test', icon: 'test', visualization: {} });
      }).to.not.throwError();
    });
  });

});
