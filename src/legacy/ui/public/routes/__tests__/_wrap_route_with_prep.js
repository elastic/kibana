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

import RouteManager from '../route_manager';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';

import _ from 'lodash';
import '../../private';

let routes;

describe('wrapRouteWithPrep fn', function() {
  require('test_utils/no_digest_promises').activateForSuite();

  beforeEach(function() {
    routes = new RouteManager();
  });

  const SchedulingTest = function(opts) {
    opts = opts || {};

    const delaySetup = opts.delayUserWork ? 0 : 50;
    const delayUserWork = opts.delayUserWork ? 50 : 0;

    return function() {
      ngMock.module('kibana');
      let setupComplete = false;
      let userWorkComplete = false;
      let route;
      let Promise;
      let $injector;

      ngMock.inject(function(_Promise_, _$injector_) {
        Promise = _Promise_;
        $injector = _$injector_;
      });

      routes.addSetupWork(function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            setupComplete = true;
            resolve();
          }, delaySetup);
        });
      });

      routes
        .when('/', {
          resolve: {
            test: function() {
              expect(setupComplete).to.be(true);
              userWorkComplete = true;
            },
          },
        })
        .config({
          when: function(p, _r) {
            route = _r;
          },
        });

      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          Promise.all(
            _.map(route.resolve, function(fn) {
              return $injector.invoke(fn);
            })
          )
            .then(function() {
              expect(setupComplete).to.be(true);
              expect(userWorkComplete).to.be(true);
            })
            .then(resolve, reject);
        }, delayUserWork);
      });
    };
  };

  it('always waits for setup to complete before calling user work', new SchedulingTest());

  it('does not call user work when setup fails', new SchedulingTest({ failSetup: true }));

  it(
    'calls all user work even if it is not initialized until after setup is complete',
    new SchedulingTest({
      delayUserWork: false,
    })
  );
});
