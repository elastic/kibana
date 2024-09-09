/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartProps, SettingsProps } from '@elastic/charts';

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

// Overrides should not expose Functions, React nodes and children props
// So filter out any type which is not serializable
export type MakeOverridesSerializable<T> = {
  [KeyType in keyof T]: NonNullable<T[KeyType]> extends Function
    ? // cannot use boolean here as it would be challenging to distinguish
      // between a "native" boolean props and a disabled callback
      // so use a specific keyword
      'ignore'
    : // be careful here to not filter out string/number types
    NonNullable<T[KeyType]> extends React.ReactChildren | React.ReactElement
    ? never
    : // make it recursive
    NonNullable<T[KeyType]> extends object
    ? MakeOverridesSerializable<T[KeyType]>
    : NonNullable<T[KeyType]>;
};

export type AllowedChartOverrides = Partial<
  Record<'chart', Simplify<MakeOverridesSerializable<Pick<ChartProps, 'title' | 'description'>>>>
>;

export type AllowedSettingsOverrides = Partial<
  Record<
    'settings',
    Simplify<
      MakeOverridesSerializable<
        Omit<
          SettingsProps,
          | 'onRenderChange'
          | 'onPointerUpdate'
          | 'orderOrdinalBinsBy'
          | 'baseTheme'
          | 'legendColorPicker'
        >
      >
    >
  >
>;
