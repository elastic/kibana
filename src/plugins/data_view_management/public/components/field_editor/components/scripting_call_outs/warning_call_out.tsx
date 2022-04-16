/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';

import { EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IndexPatternManagmentContext } from '../../../../types';

export interface ScriptingWarningCallOutProps {
  isVisible: boolean;
}

export const ScriptingWarningCallOut = ({ isVisible = false }: ScriptingWarningCallOutProps) => {
  const docLinks = useKibana<IndexPatternManagmentContext>().services.docLinks?.links;
  return isVisible ? (
    <Fragment>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="indexPatternManagement.warningCallOutLabel.callOutDetail"
            defaultMessage="Familiarize yourself with {scripFields} and {scriptsInAggregation} before using this feature.
            Scripted fields can be used to display and aggregate calculated values. As such, they can be very slow and,
            if done incorrectly, can cause Kibana to become unusable."
            values={{
              scripFields: (
                <EuiLink target="_blank" href={docLinks.scriptedFields.scriptFields}>
                  <FormattedMessage
                    id="indexPatternManagement.warningCallOutLabel.scripFieldsLink"
                    defaultMessage="scripted fields"
                  />
                </EuiLink>
              ),
              scriptsInAggregation: (
                <EuiLink target="_blank" href={docLinks.scriptedFields.scriptAggs}>
                  <FormattedMessage
                    id="indexPatternManagement.warningCallOutLabel.scriptsInAggregationLink"
                    defaultMessage="scripts in aggregations"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiCallOut
        color="warning"
        iconType="alert"
        title={
          <FormattedMessage
            id="indexPatternManagement.scriptedFieldsDeprecatedTitle"
            defaultMessage="Scripted fields are deprecated"
            description="Deprecation warning title within scripted field editor"
          />
        }
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="indexPatternManagement.scriptedFieldsDeprecatedBody"
              defaultMessage="For greater flexibility and Painless script support, use {runtimeDocs}."
              values={{
                runtimeDocs: (
                  <EuiLink target="_blank" href={docLinks.runtimeFields.overview}>
                    <FormattedMessage
                      id="indexPatternManagement.warningCallOutLabel.runtimeLink"
                      defaultMessage="runtime fields"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </Fragment>
  ) : null;
};

ScriptingWarningCallOut.displayName = 'ScriptingWarningCallOut';
