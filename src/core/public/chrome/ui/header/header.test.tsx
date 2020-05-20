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

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { NavType } from '.';
import { httpServiceMock } from '../../../http/http_service.mock';
import { applicationServiceMock } from '../../../mocks';
import { Header } from './header';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

function mockProps() {
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });
  const application = applicationServiceMock.createInternalStartContract();

  return {
    application,
    kibanaVersion: '1.0.0',
    appTitle$: new BehaviorSubject('test'),
    badge$: new BehaviorSubject(undefined),
    breadcrumbs$: new BehaviorSubject([]),
    homeHref: '/',
    isVisible$: new BehaviorSubject(true),
    kibanaDocLink: '/docs',
    navLinks$: new BehaviorSubject([]),
    recentlyAccessed$: new BehaviorSubject([]),
    forceAppSwitcherNavigation$: new BehaviorSubject(false),
    helpExtension$: new BehaviorSubject(undefined),
    helpSupportUrl$: new BehaviorSubject(''),
    legacyMode: false,
    navControlsLeft$: new BehaviorSubject([]),
    navControlsRight$: new BehaviorSubject([]),
    basePath: http.basePath,
    isLocked$: new BehaviorSubject(false),
    navType$: new BehaviorSubject('modern' as NavType),
    loadingCount$: new BehaviorSubject(0),
    onIsLockedUpdate: () => {},
  };
}

// describe('Header', () => {
//   it('renders an empty header', () => {
//     const component = mountWithIntl(<Header {...mockProps()} />);
//     expect(component).toMatchSnapshot();
//   });
// });
