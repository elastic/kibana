/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren, FC } from 'react';
import { FormattedRelativeTime, IntlShape } from 'react-intl';
import { selectUnit } from '@formatjs/intl-utils';
import moment from 'moment';
import { I18nProvider } from './provider';

export interface FormattedRelativeProps {
  value: Date | number | string;
  updateIntervalInSeconds?: number;
}
/**
 * Mimic `FormattedRelative` previous behavior from formatJS v2
 */
export const FormattedRelative = ({
  value: valueInput,
  updateIntervalInSeconds,
}: FormattedRelativeProps) => {
  const valueDate = moment(valueInput).isValid() ? moment(valueInput).toDate() : new Date();

  const { value, unit } = selectUnit(valueDate, new Date());
  return (
    <FormattedRelativeTime
      value={value}
      numeric="auto"
      unit={unit}
      updateIntervalInSeconds={updateIntervalInSeconds}
    />
  );
};

/**
 * Added for now while doing the i18n upgrade.
 * TODO: remove in a separate PR and update the 200+ test files we have using this to simply
 * use the `I18nProvider` and the `IntlShape` instead of `InjectedIntl`.
 */

export const __IntlProvider: FC<PropsWithChildren<{ locale?: string; messages?: unknown }>> = ({
  children,
}) => {
  // Drop `locale` and `messages` since we define it inside `i18n`, we no longer pass it to the provider.
  return <I18nProvider>{children}</I18nProvider>;
};
export type InjectedIntl = IntlShape;
