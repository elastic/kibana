/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedRelativeTime } from 'react-intl';
import { selectUnit } from '@formatjs/intl-utils';
import moment from 'moment';

export interface FormattedRelativeProps {
  value: Date | number | string;
}
/**
 * Mimic `FormattedRelative` previous behavior from formatJS v2
 */
export const FormattedRelative = ({ value: valueDate }: FormattedRelativeProps) => {
  const { value, unit } = selectUnit(moment(Date.now()).diff(moment(valueDate)));

  return <FormattedRelativeTime value={value} unit={unit} />;
};
