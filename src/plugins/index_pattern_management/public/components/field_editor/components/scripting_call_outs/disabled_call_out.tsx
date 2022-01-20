/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

export const ScriptingDisabledCallOut = ({ isVisible = false }) => {
  return isVisible ? (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="indexPatternManagement.disabledCallOutHeader"
            defaultMessage="Scripting disabled"
            description="Showing the status that scripting is disabled in Elasticsearch. Not an update message, that it JUST got disabled."
          />
        }
        color="danger"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="indexPatternManagement.disabledCallOutLabel"
            defaultMessage="All inline scripting has been disabled in Elasticsearch. You must enable inline scripting for at least one
            language in order to use scripted fields in Kibana."
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  ) : null;
};

ScriptingDisabledCallOut.displayName = 'ScriptingDisabledCallOut';
