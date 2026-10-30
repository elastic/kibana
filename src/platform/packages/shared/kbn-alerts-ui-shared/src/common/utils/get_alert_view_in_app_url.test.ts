/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultAlertFormatterFormatters } from '../formatters';
import type { AlertFormatter } from '../types/alert_formatter_types';
import { getAlertViewInAppUrl } from './get_alert_view_in_app_url';

const prepend = (path: string) => `/s/space${path}`;

describe('getAlertViewInAppUrl', () => {
  it('prepends the base path when the link does not include it', () => {
    const formatter: AlertFormatter = () => ({ reason: '', link: '/app/apm' });

    expect(getAlertViewInAppUrl({ alert: {}, formatter, prepend })).toBe('/s/space/app/apm');
  });

  it('returns the link unchanged when it already includes the base path', () => {
    const formatter: AlertFormatter = () => ({
      reason: '',
      link: '/s/space/app/apm',
      hasBasePath: true,
    });

    expect(getAlertViewInAppUrl({ alert: {}, formatter, prepend })).toBe('/s/space/app/apm');
  });

  it('returns null when the formatter returns no link', () => {
    const formatter: AlertFormatter = () => ({ reason: 'reason' });

    expect(getAlertViewInAppUrl({ alert: {}, formatter, prepend })).toBeNull();
  });

  it('returns null when the formatter throws', () => {
    const formatter: AlertFormatter = () => {
      throw new Error('boom');
    };

    expect(getAlertViewInAppUrl({ alert: {}, formatter, prepend })).toBeNull();
  });

  it('passes scalar values as-is and the first element of array values', () => {
    const formatter = jest.fn<ReturnType<AlertFormatter>, Parameters<AlertFormatter>>(() => ({
      reason: '',
      link: '/app/apm',
    }));

    getAlertViewInAppUrl({
      alert: { 'service.name': ['opbeans-java', 'ignored'], 'service.environment': 'production' },
      formatter,
      prepend,
    });

    expect(formatter).toHaveBeenCalledWith({
      fields: { 'service.name': 'opbeans-java', 'service.environment': 'production' },
      formatters: defaultAlertFormatterFormatters,
    });
  });

  it('passes array values unchanged when unwrapping is disabled', () => {
    const formatter = jest.fn<ReturnType<AlertFormatter>, Parameters<AlertFormatter>>(() => ({
      reason: '',
      link: '/app/apm',
    }));

    getAlertViewInAppUrl({
      alert: { 'kibana.alert.group.field': ['host.name', 'service.name'] },
      formatter,
      prepend,
      unwrapArrayValues: false,
    });

    expect(formatter).toHaveBeenCalledWith({
      fields: { 'kibana.alert.group.field': ['host.name', 'service.name'] },
      formatters: defaultAlertFormatterFormatters,
    });
  });
});
