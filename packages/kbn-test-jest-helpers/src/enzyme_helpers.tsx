/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Components using the @kbn/i18n module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * intl context around them.
 */

import { I18nProvider, InjectedIntl, intlShape, __IntlProvider } from '@kbn/i18n-react';
import { mount, ReactWrapper, render, shallow } from 'enzyme';
import React, { ReactElement, ValidationMap } from 'react';
import { act as reactAct } from 'react-dom/test-utils';

// Use fake component to extract `intl` property to use in tests.
const { intl } = (
  mount(
    <I18nProvider>
      <br />
    </I18nProvider>
  ).find('IntlProvider') as ReactWrapper<{}, {}, __IntlProvider>
)
  .instance()
  .getChildContext();

function getOptions(context = {}, childContextTypes = {}, props = {}) {
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
 * When using @kbn/i18n `injectI18n` on components, props.intl is required.
 */
// This function is exported solely to fix the types output in TS 4.5.2, likely a bug
// Otherwise, InjectedIntl is missing from the output
export function nodeWithIntlProp<T>(
  node: ReactElement<T>
): ReactElement<T & { intl: InjectedIntl }> {
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
    attachTo?: HTMLElement;
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
): any {
  const options = getOptions(context, childContextTypes, props);

  return render(nodeWithIntlProp(node), options);
}

/**
 * A wrapper object to provide access to the state of a hook under test and to
 * enable interaction with that hook.
 */
interface ReactHookWrapper<Args, HookValue> {
  /* Ensures that async React operations have settled before and after the
   * given actor callback is called. The actor callback arguments provide easy
   * access to the last hook value and allow for updating the arguments passed
   * to the hook body to trigger reevaluation.
   */
  act: (actor: (lastHookValue: HookValue, setArgs: (args: Args) => void) => void) => void;
  /* The enzyme wrapper around the test component. */
  component: ReactWrapper;
  /* The most recent value return the by test harness of the hook. */
  getLastHookValue: () => HookValue;
  /* The jest Mock function that receives the hook values for introspection. */
  hookValueCallback: jest.Mock;
}

/**
 * Allows for execution of hooks inside of a test component which records the
 * returned values.
 *
 * @param body A function that calls the hook and returns data derived from it
 * @param WrapperComponent A component that, if provided, will be wrapped
 * around the test component. This can be useful to provide context values.
 * @return {ReactHookWrapper} An object providing access to the hook state and
 * functions to interact with it.
 */
export const mountHook = <Args extends {}, HookValue extends any>(
  body: (args: Args) => HookValue,
  WrapperComponent?: React.ComponentType,
  initialArgs: Args = {} as Args
): ReactHookWrapper<Args, HookValue> => {
  const hookValueCallback = jest.fn();
  let component!: ReactWrapper;

  const act: ReactHookWrapper<Args, HookValue>['act'] = (actor) => {
    reactAct(() => {
      actor(getLastHookValue(), (args: Args) => component.setProps(args));
      component.update();
    });
  };

  const getLastHookValue = () => {
    const calls = hookValueCallback.mock.calls;
    if (calls.length <= 0) {
      throw Error('No recent hook value present.');
    }
    return calls[calls.length - 1][0];
  };

  const HookComponent = (props: Args) => {
    hookValueCallback(body(props));
    return null;
  };
  const TestComponent: React.FunctionComponent<Args> = (args) =>
    WrapperComponent ? (
      <WrapperComponent>
        <HookComponent {...args} />
      </WrapperComponent>
    ) : (
      <HookComponent {...args} />
    );

  reactAct(() => {
    component = mount(<TestComponent {...initialArgs} />);
  });

  return {
    act,
    component,
    getLastHookValue,
    hookValueCallback,
  };
};

export function shallowWithI18nProvider<T>(child: ReactElement<T>) {
  const wrapped = shallow(<I18nProvider>{child}</I18nProvider>);
  const name = typeof child.type === 'string' ? child.type : child.type.name;
  return wrapped.find(name).dive();
}

export function mountWithI18nProvider<T>(child: ReactElement<T>) {
  const wrapped = mount(<I18nProvider>{child}</I18nProvider>);
  const name = typeof child.type === 'string' ? child.type : child.type.name;
  return wrapped.find(name);
}
