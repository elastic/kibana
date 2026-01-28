/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps, type PropsWithChildren } from 'react';
import { act, render, type RenderOptions } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiProvider } from '@elastic/eui';
import {
  ContentListProvider,
  type ContentListProviderProps,
  type ContentListItem,
} from '@kbn/content-list-provider';

type EuiProviderSharedProps = Partial<ComponentProps<typeof EuiProvider>>;

/**
 * Options for rendering with i18n and EUI providers.
 */
interface IntlEuiOptions {
  /** Locale for i18n (default: 'en'). */
  locale?: string;
  /** Additional i18n messages. */
  messages?: Record<string, string>;
  /** Props to pass to `EuiProvider`. */
  euiProviderProps?: EuiProviderSharedProps;
  /** Options to pass to `@testing-library/react` render. */
  renderOptions?: RenderOptions;
}

/**
 * Options for rendering with {@link ContentListProvider}.
 */
export interface RenderWithProvidersOptions extends IntlEuiOptions {
  /** Optional overrides for {@link ContentListProviderProps}. */
  providerOverrides?: Partial<ContentListProviderProps>;
}

type ProviderDataSource = ContentListProviderProps['dataSource'];

/**
 * Default findItems function for testing.
 * Returns an empty result set.
 */
const defaultFindItems: ProviderDataSource['findItems'] = async () => ({
  items: [],
  total: 0,
});

/**
 * Identity transform for testing.
 * When tests provide `ContentListItem[]` directly, this passes them through unchanged.
 * Cast is required because tests bypass the `UserContentCommonSchema` → `ContentListItem` transform.
 */
const identityTransform = ((item: ContentListItem) => item) as unknown as NonNullable<
  ProviderDataSource['transform']
>;

/**
 * Creates a typed findItems function for testing.
 * This allows tests to use `ContentListItem[]` directly without TypeScript errors.
 */
export const createTestFindItems = (items: ContentListItem[]) => {
  return (async () => ({
    items,
    total: items.length,
  })) as unknown as ProviderDataSource['findItems'];
};

const defaultProviderProps: ContentListProviderProps = {
  entityName: 'item',
  entityNamePlural: 'items',
  dataSource: {
    findItems: defaultFindItems,
    transform: identityTransform,
  },
  services: {},
  features: {
    search: true,
    filtering: true,
  },
};

const buildProviderProps = (
  overrides?: Partial<ContentListProviderProps>
): ContentListProviderProps => {
  if (!overrides) {
    return {
      ...defaultProviderProps,
      dataSource: { ...defaultProviderProps.dataSource },
      features: { ...defaultProviderProps.features },
    };
  }

  return {
    ...defaultProviderProps,
    ...overrides,
    dataSource: {
      ...defaultProviderProps.dataSource,
      ...overrides.dataSource,
      transform: overrides.dataSource?.transform ?? identityTransform,
    },
    features: {
      ...defaultProviderProps.features,
      ...overrides.features,
    },
  };
};

/**
 * Utility to flush pending promises in tests.
 * Useful for waiting for async state updates.
 *
 * @returns A promise that resolves on the next tick.
 */
export const flushPromises = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Render a component with i18n and EUI providers for testing.
 *
 * @param ui - React element to render.
 * @param options - Optional configuration for locale, messages, and EUI props.
 * @returns The render result from `@testing-library/react`.
 */
export const renderWithIntlEui = async (
  ui: React.ReactElement,
  { locale = 'en', messages = {}, euiProviderProps, renderOptions }: IntlEuiOptions = {}
) => {
  i18n.init({ locale, messages });

  const Wrapper = ({ children }: PropsWithChildren<unknown>) => (
    <I18nProvider>
      <EuiProvider colorMode="LIGHT" {...euiProviderProps}>
        {children}
      </EuiProvider>
    </I18nProvider>
  );

  let renderResult: ReturnType<typeof render> | undefined;

  await act(async () => {
    renderResult = render(ui, {
      ...renderOptions,
      wrapper: Wrapper,
    });
  });

  await act(async () => {
    await flushPromises();
  });

  return renderResult!;
};

/**
 * Render a component with {@link ContentListProvider} and i18n/EUI providers for testing.
 *
 * @param ui - React element to render.
 * @param options - Optional configuration including provider overrides.
 * @returns The render result from `@testing-library/react`.
 */
export const renderWithContentListProviders = async (
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) => {
  const { providerOverrides, ...intlOptions } = options;
  const providerProps = buildProviderProps(providerOverrides);

  const renderResult = await renderWithIntlEui(
    <ContentListProvider {...providerProps}>{ui}</ContentListProvider>,
    intlOptions
  );

  await act(async () => {
    await flushPromises();
  });

  return renderResult!;
};

/**
 * Create a wrapper component with {@link ContentListProvider} and i18n/EUI providers.
 *
 * Useful for testing hooks with `@testing-library/react-hooks`.
 *
 * @param providerOverrides - Optional overrides for {@link ContentListProviderProps}.
 * @param intlOptions - Optional i18n and EUI configuration.
 * @returns A React component that wraps children with all necessary providers.
 */
export const createContentListProviderWrapper = (
  providerOverrides?: Partial<ContentListProviderProps>,
  intlOptions?: Omit<IntlEuiOptions, 'renderOptions'>
) => {
  const providerProps = buildProviderProps(providerOverrides);
  const { locale = 'en', messages = {}, euiProviderProps } = intlOptions ?? {};

  i18n.init({ locale, messages });

  return ({ children }: PropsWithChildren<unknown>) => (
    <I18nProvider>
      <EuiProvider colorMode="LIGHT" {...euiProviderProps}>
        <ContentListProvider {...providerProps}>{children}</ContentListProvider>
      </EuiProvider>
    </I18nProvider>
  );
};
