/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';

export interface Error {
  error: string;
  cause?: string[];
  message?: string;
}

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
    <EuiCallOut title={title} color="danger" iconType="alert" {...rest}>
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
