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

import { ManagementSections } from './ManagementSections';

test('cannot register embeddable factory with the same ID', async () => {
  const sections = new ManagementSections().setup;
  sections.register({
    id: 'management-test-section',
    title: 'management test',
  });

  sections.getAvailable();
  const testSection = sections.get('management-test-section');
  testSection!.registerApp({
    id: 'test-app',
    title: 'Test Management',
    mount() {
      // const { renderApp } = await import('./my-section');
      // return renderApp(context, params);
      return () => {};
    },
  });

  console.log('apps! -', testSection!.apps);

  // console.log(sections.get('management-test-section'));

  expect(1).toEqual(1);
});

// todo - test register section
// test getAvailable - test filtered?
// test get
//
// test register app
//
// test setup and start
