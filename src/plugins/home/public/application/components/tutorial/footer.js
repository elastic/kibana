/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, EuiButton } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export function Footer({ url, label }) {
  return (
    <div>
      <EuiHorizontalRule />

      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText>
            <p>
              <FormattedMessage
                id="home.exploreYourDataDescription"
                defaultMessage="When all steps are complete, you're ready to explore your data."
              />
            </p>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton fill href={url}>
            {label}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}

Footer.propTypes = {
  url: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};
