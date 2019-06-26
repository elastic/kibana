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

import { i18nDirective, i18nFilter, I18nProvider } from '@kbn/i18n/angular';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { npStart } from 'ui/new_platform';

export const I18nContext = npStart.core.i18n.Context;

export function wrapInI18nContext<P>(ComponentToWrap: React.ComponentType<P>) {
  const ContextWrapper: React.SFC<P> = props => {
    return (
      <I18nContext>
        <ComponentToWrap {...props} />
      </I18nContext>
    );
  };

  // Original propTypes from the wrapped component should be re-exposed
  // since it will be used by reactDirective Angular service
  // that will rely on propTypes to watch attributes with these names
  ContextWrapper.propTypes = ComponentToWrap.propTypes;

  return ContextWrapper;
}

uiModules
  .get('i18n')
  .provider('i18n', I18nProvider)
  .filter('i18n', i18nFilter)
  .directive('i18nId', i18nDirective);
