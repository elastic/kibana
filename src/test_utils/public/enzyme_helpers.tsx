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

/**
 * Components using the react-intl module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * intl context around them.
 */

import { I18nProvider, InjectedIntl, intlShape } from '@kbn/i18n/react';
import { mount, ReactWrapper, render, shallow } from 'enzyme';
import React, { ReactElement, ValidationMap } from 'react';

// Use fake component to extract `intl` property to use in tests.
const { intl } = (mount(
  <I18nProvider>
    <br />
  </I18nProvider>
).find('IntlProvider') as ReactWrapper<{}, {}, import('react-intl').IntlProvider>)
  .instance()
  .getChildContext();

function getOptions(context = {}, childContextTypes: ValidationMap<any> = {}, props = {}) {
  return {
    context: {
      ...context,
      intl,
    },
    childContextTypes: {
      ...childContextTypes,
      intl: intlShape,
    },
    ...props,
  };
}

/**
 * When using React-Intl `injectIntl` on components, props.intl is required.
 */
function nodeWithIntlProp<T>(node: ReactElement<T>): ReactElement<T & { intl: InjectedIntl }> {
  return React.cloneElement<any>(node, { intl });
}

/**
 *  Creates the wrapper instance using shallow with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into shallow wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function shallowWithIntl<T>(
  node: ReactElement<T>,
  {
    context,
    childContextTypes,
    ...props
  }: {
    context?: any;
    childContextTypes?: ValidationMap<any>;
  } = {}
) {
  const options = getOptions(context, childContextTypes, props);

  return shallow(nodeWithIntlProp(node), options);
}

/**
 *  Creates the wrapper instance using mount with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into mount wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function mountWithIntl<T>(
  node: ReactElement<T>,
  {
    context,
    childContextTypes,
    ...props
  }: {
    context?: any;
    childContextTypes?: ValidationMap<any>;
  } = {}
) {
  const options = getOptions(context, childContextTypes, props);

  return mount(nodeWithIntlProp(node), options);
}

/**
 *  Creates the wrapper instance using render with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into render wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function renderWithIntl<T>(
  node: ReactElement<T>,
  {
    context,
    childContextTypes,
    ...props
  }: {
    context?: any;
    childContextTypes?: ValidationMap<any>;
  } = {}
) {
  const options = getOptions(context, childContextTypes, props);

  return render(nodeWithIntlProp(node), options);
}

export const nextTick = () => new Promise(res => process.nextTick(res));
const MAX_WAIT = 30;
export const waitFor = async (fn: () => void, wrapper?: ReactWrapper) => {
  console.log('in waitFor');
  await nextTick();
  if (wrapper) {
    wrapper.update();
  }
  let errorCount = 0;
  while (true) {
    try {
      fn();
      return;
    } catch (e) {
      errorCount++;
      console.log('Error: ', e);
      await nextTick();
      if (wrapper) {
        wrapper.update();
      }
      if (errorCount > MAX_WAIT) {
        throw new Error(e);
        return;
      }
    }
  }
};
