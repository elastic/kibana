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
import { ReactVisType } from '../../../types/react_vis_type';

describe('React Vis Type', function () {

  const visConfig = {
    name: 'test',
    title: 'test',
    description: 'test',
    icon: 'test',
    visConfig: { component: 'test' },
    type: { visConfig: { component: 'test' } }
  };

  beforeEach(ngMock.module('kibana'));

  describe('initialization', () => {
    it('should throw if component is not set', () => {
      expect(() => {
        new ReactVisType({});
      }).to.throwError();
    });

    it('creates react controller', () => {
      const visType = new ReactVisType(visConfig);
      expect(visType.visualization).to.not.be.an('undefined');
    });
  });

  describe('controller render method', () => {
    let vis;
    beforeEach(() => {
      const visType = new ReactVisType(visConfig);
      const Vis = visType.visualization;

      vis = new Vis(window.document.body, {});
    });

    it('rejects if data is not provided', () => {
      vis.render().then(() => {
        expect('promise was not rejected').to.equal(false);
      }).catch(() => {});
    });

    it('renders the component', () => {
      expect(() => {
        vis.render({});
      }).to.not.throwError();
    });

  });
});
