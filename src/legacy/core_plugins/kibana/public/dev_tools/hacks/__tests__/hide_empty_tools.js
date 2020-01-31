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
import sinon from 'sinon';

import { hideEmptyDevTools } from '../hide_empty_tools';
import { npStart } from 'ui/new_platform';

describe('hide dev tools', function() {
  let updateNavLink;

  function PrivateWithoutTools() {
    return [];
  }

  function PrivateWithTools() {
    return ['tool1', 'tool2'];
  }

  function isHidden() {
    return updateNavLink.calledWith('kibana:dev_tools', { hidden: true });
  }

  beforeEach(function() {
    const coreNavLinks = npStart.core.chrome.navLinks;
    updateNavLink = sinon.spy(coreNavLinks, 'update');
  });

  it('should hide the app if there are no dev tools', function() {
    hideEmptyDevTools(PrivateWithTools);
    expect(isHidden()).to.be(false);
  });

  it('should not hide the app if there are tools', function() {
    hideEmptyDevTools(PrivateWithoutTools);
    expect(isHidden()).to.be(true);
  });

  afterEach(function() {
    updateNavLink.restore();
  });
});
