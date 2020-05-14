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
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import { NotFoundErrors } from './not_found_errors';

describe('NotFoundErrors component', () => {
  const mountError = (type: string) =>
    mount(
      <I18nProvider>
        <NotFoundErrors type={type} />
      </I18nProvider>
    ).find('NotFoundErrors');

  it('renders correctly for search type', () => {
    const mounted = mountError('search');
    expect(mounted).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectThe saved search associated with this object no longer exists.If you know what this error means, go ahead and fix it — otherwise click the delete button above."`
    );
  });

  it('renders correctly for index-pattern type', () => {
    const mounted = mountError('index-pattern');
    expect(mounted).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectThe index pattern associated with this object no longer exists.If you know what this error means, go ahead and fix it — otherwise click the delete button above."`
    );
  });

  it('renders correctly for index-pattern-field type', () => {
    const mounted = mountError('index-pattern-field');
    expect(mounted).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectA field associated with this object no longer exists in the index pattern.If you know what this error means, go ahead and fix it — otherwise click the delete button above."`
    );
  });

  it('renders correctly for unknown type', () => {
    const mounted = mountError('unknown');
    expect(mounted).toMatchSnapshot();
    expect(mounted.text()).toMatchInlineSnapshot(
      `"There is a problem with this saved objectIf you know what this error means, go ahead and fix it — otherwise click the delete button above."`
    );
  });
});
