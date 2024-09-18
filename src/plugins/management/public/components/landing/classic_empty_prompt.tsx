/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { type FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiHorizontalRule } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

interface Props {
  kibanaVersion: string;
}

export const ClassicEmptyPrompt: FC<Props> = ({ kibanaVersion }) => {
  return (
    <KibanaPageTemplate.EmptyPrompt
      data-test-subj="managementHome"
      iconType="managementApp"
      title={
        <h1>
          <FormattedMessage
            id="management.landing.header"
            defaultMessage="Welcome to Stack Management {version}"
            values={{ version: kibanaVersion }}
          />
        </h1>
      }
      body={
        <>
          <p>
            <FormattedMessage
              id="management.landing.subhead"
              defaultMessage="Manage your indices, data views, saved objects, Kibana settings, and more."
            />
          </p>
          <EuiHorizontalRule />
          <p>
            <FormattedMessage
              id="management.landing.text"
              defaultMessage="A complete list of apps is in the menu on the left."
            />
          </p>
        </>
      }
    />
  );
};
