/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiCallOut, EuiIcon, EuiLink, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { useKibana } from '../../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../../types';

export interface ScriptingWarningCallOutProps {
  isVisible: boolean;
}

export const ScriptingWarningCallOut = ({ isVisible = false }: ScriptingWarningCallOutProps) => {
  const docLinksScriptedFields = useKibana<IndexPatternManagmentContext>().services.docLinks?.links
    .scriptedFields;
  return isVisible ? (
    <Fragment>
      <EuiCallOut
        title={
          <FormattedMessage
            id="indexPatternManagement.warningCallOutHeader"
            defaultMessage="Proceed with caution"
          />
        }
        color="warning"
        iconType="alert"
      >
        <p>
          <FormattedMessage
            id="indexPatternManagement.warningCallOutLabel.callOutDetail"
            defaultMessage="Please familiarize yourself with {scripFields} and with {scriptsInAggregation} before using scripted fields."
            values={{
              scripFields: (
                <EuiLink target="_blank" href={docLinksScriptedFields.scriptFields}>
                  <FormattedMessage
                    id="indexPatternManagement.warningCallOutLabel.scripFieldsLink"
                    defaultMessage="script fields"
                  />
                  &nbsp;
                  <EuiIcon type="link" />
                </EuiLink>
              ),
              scriptsInAggregation: (
                <EuiLink target="_blank" href={docLinksScriptedFields.scriptAggs}>
                  <FormattedMessage
                    id="indexPatternManagement.warningCallOutLabel.scriptsInAggregationLink"
                    defaultMessage="scripts in aggregations"
                  />
                  &nbsp;
                  <EuiIcon type="link" />
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="indexPatternManagement.warningCallOut.descriptionLabel"
            defaultMessage="Scripted fields can be used to display and aggregate calculated values. As such, they can be very slow, and
            if done incorrectly, can cause Kibana to be unusable. There's no safety net here. If you make a typo, unexpected exceptions
            will be thrown all over the place!"
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  ) : null;
};

ScriptingWarningCallOut.displayName = 'ScriptingWarningCallOut';
