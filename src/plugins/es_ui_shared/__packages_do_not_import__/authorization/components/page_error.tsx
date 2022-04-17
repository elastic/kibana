/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSpacer, EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';
import React from 'react';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { Error } from '../types';

interface Props {
  title: React.ReactNode;
  error?: Error;
  actions?: JSX.Element;
  isCentered?: boolean;
}

/*
 * A reusable component to handle full page errors.
 * This is based on Kibana design guidelines related
 * to the new management navigation structure.
 * In some scenarios, it replaces the usage of <SectionError />.
 */

export const PageError: React.FunctionComponent<Props> = ({
  title,
  error,
  actions,
  isCentered,
  ...rest
}) => {
  const errorString = error?.error;
  const cause = error?.cause; // wrapEsError() on the server adds a "cause" array
  const message = error?.message;

  const errorContent = (
    <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
      <EuiEmptyPrompt
        title={<h2>{title}</h2>}
        body={
          error && (
            <>
              {cause ? (
                message || errorString
              ) : (
                <p className="eui-textBreakWord">{message || errorString}</p>
              )}
              {cause && (
                <>
                  <EuiSpacer size="s" />
                  <ul>
                    {cause.map((causeMsg, i) => (
                      <li key={i}>{causeMsg}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )
        }
        iconType="alert"
        actions={actions}
        {...rest}
      />
    </EuiPageContent>
  );

  if (isCentered) {
    return <div className={APP_WRAPPER_CLASS}>{errorContent}</div>;
  }

  return errorContent;
};
