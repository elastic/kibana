/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment-timezone';
import { labelDateFormatter } from './label_date_formatter';

const dateString = '2020-09-24T18:59:02.000Z';

describe('Label Date Formatter Function', () => {
  it('Should format the date string', () => {
    const label = labelDateFormatter(dateString);
    expect(label).toEqual(moment(dateString).format('lll'));
  });

  it('Should format the date string on the given formatter', () => {
    const label = labelDateFormatter(dateString, 'MM/DD/YYYY');
    expect(label).toEqual(moment(dateString).format('MM/DD/YYYY'));
  });

  it('Returns the label if it is not date string', () => {
    const label = labelDateFormatter('test date');
    expect(label).toEqual('test date');
  });

  it('Returns the label if it is a number string', () => {
    const label = labelDateFormatter('1');
    expect(label).toEqual('1');
  });
});
