/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Components using the @kbn/i18n module require access to the intl context.
 * This is not available when mounting single components in Enzyme.
 * These helper functions aim to address that and wrap a valid,
 * intl context around them.
 */

import { I18nProvider, IntlShape } from '@kbn/i18n-react';
import {
  mount,
  ReactWrapper,
  render,
  shallow,
  MountRendererProps,
  ShallowRendererProps,
  ComponentType,
} from 'enzyme';
import React, { ReactElement } from 'react';
import { act as reactAct } from 'react-dom/test-utils';
import propTypes from 'prop-types';
import { createIntl } from '@formatjs/intl';
import { i18n } from '@kbn/i18n';

const intl = createIntl(i18n.getTranslation());

/**
 * When using @kbn/i18n `injectI18n` on components, props.intl is required.
 */
export function nodeWithIntlProp<T>(node: ReactElement<T>): ReactElement<T & { intl: IntlShape }> {
  return React.cloneElement<any>(node, { intl });
}

function getOptions(context = {}, props = {}) {
  return {
    context: {
      ...context,
      intl,
    },
    childContextTypes: {
      intl: propTypes.object,
    },
    ...props,
  };
}

/**
 *  Creates the wrapper instance using shallow with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into shallow wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function shallowWithIntl(
  node: React.ReactElement,
  options?: ShallowRendererProps & { wrappingComponent?: React.ComponentType }
) {
  const { context, ...props } = options || {};

  const optionsWithIntl = getOptions(context, props);

  return shallow(nodeWithIntlProp(node), {
    wrappingComponent: I18nProvider as ComponentType<{}>,
    ...optionsWithIntl,
  });
}

/**
 *  Creates the wrapper instance using mount with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into mount wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function mountWithIntl(node: React.ReactElement, options?: MountRendererProps) {
  const { context, ...props } = options || {};

  const optionsWithIntl = getOptions(context, props);

  return mount(nodeWithIntlProp(node), {
    wrappingComponent: I18nProvider as ComponentType<{}>,
    ...optionsWithIntl,
  });
}

/**
 *  Creates the wrapper instance using render with provided intl object into context
 *
 *  @param node The React element or cheerio wrapper
 *  @param options properties to pass into render wrapper
 *  @return The wrapper instance around the rendered output with intl object in context
 */
export function renderWithIntl<T>(node: React.ReactElement<T>, options?: any) {
  const { context, ...props } = options || {};

  const optionsWithIntl = getOptions(context, props);

  return render(nodeWithIntlProp(node), {
    wrappingComponent: I18nProvider as ComponentType<{}>,
    ...optionsWithIntl,
  });
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
  WrapperComponent?: React.ComponentType<{ children?: React.ReactNode }>,
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

export function shallowWithI18nProvider<T>(
  child: ReactElement<T>,
  options?: Omit<ShallowRendererProps, 'wrappingComponent'> & {
    wrappingComponent?: React.ComponentType<React.PropsWithChildren<any>> | ComponentType<any>;
  }
) {
  const wrapped = shallow(<I18nProvider>{child}</I18nProvider>, options as ShallowRendererProps);
  return wrapped.children().dive();
}

export function mountWithI18nProvider<T>(
  child: ReactElement<T>,
  options?: Omit<MountRendererProps, 'wrappingComponent'> & {
    wrappingComponent?: React.ComponentType<React.PropsWithChildren<any>> | ComponentType<any>;
  }
) {
  const wrapped = mount(<I18nProvider>{child}</I18nProvider>, options as MountRendererProps);
  return wrapped.children().childAt(0);
}

export function renderWithI18nProvider<T>(
  child: ReactElement<T>,
  options?: Omit<MountRendererProps, 'wrappingComponent'> & {
    wrappingComponent?: React.ComponentType<React.PropsWithChildren<any>> | ComponentType<any>;
  }
) {
  return render(<I18nProvider>{child}</I18nProvider>, options);
}
