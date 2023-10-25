/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { FormattedDate, FormattedTime } from '@kbn/i18n-react';

interface Props {
  date: Date;
  hideTime?: boolean;
}

export const FormattedDateTime: React.FC<Props> = ({ date, hideTime = false }) => (
  <>
    <FormattedDate value={date} year="numeric" month="short" day="numeric" />
    {!hideTime && (
      <>
        {' '}
        <FormattedTime value={date} />
      </>
    )}
  </>
);
