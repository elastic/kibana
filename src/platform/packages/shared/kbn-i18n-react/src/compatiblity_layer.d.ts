/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropsWithChildren, FC } from 'react';
import type React from 'react';
import type { IntlShape } from 'react-intl';
export interface FormattedRelativeProps {
  value: Date | number | string;
  updateIntervalInSeconds?: number;
}
/**
 * Mimic `FormattedRelative` previous behavior from formatJS v2
 */
export declare const FormattedRelative: ({
  value: valueInput,
  updateIntervalInSeconds,
}: FormattedRelativeProps) => React.JSX.Element;
/**
 * Added for now while doing the i18n upgrade.
 * TODO: remove in a separate PR and update the 200+ test files we have using this to simply
 * use the `I18nProvider` and the `IntlShape` instead of `InjectedIntl`.
 */
export declare const __IntlProvider: FC<
  PropsWithChildren<{
    locale?: string;
    messages?: unknown;
  }>
>;
export type InjectedIntl = IntlShape;
