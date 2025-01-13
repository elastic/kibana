/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { Error } from '../types';

interface Props {
  title: React.ReactNode;
  error: Error;
  actions?: JSX.Element;
}

export const SectionError: React.FunctionComponent<Props> = ({
  title,
  error,
  actions,
  ...rest
}) => {
  const {
    error: errorString,
    cause, // wrapEsError() on the server adds a "cause" array
    message,
  } = error;

  return (
    <EuiCallOut title={title} color="danger" iconType="warning" {...rest}>
      {cause ? message || errorString : <p>{message || errorString}</p>}
      {cause && (
        <Fragment>
          <EuiSpacer size="s" />
          <ul>
            {cause.map((causeMsg, i) => (
              <li key={i}>{causeMsg}</li>
            ))}
          </ul>
        </Fragment>
      )}
      {actions ? actions : null}
    </EuiCallOut>
  );
};
