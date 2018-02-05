import React from 'react';
import PropTypes from 'prop-types';

import {
  KuiLinkButton,
} from 'ui_framework/components';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';

export function Footer({ overviewDashboard }) {
  if (overviewDashboard) {
    return (
      <div>
        <EuiHorizontalRule />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">

          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                {`When all steps are complete, you're ready to explore your data.`}
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
          >
            <KuiLinkButton
              buttonType="primary"
              href={`#/dashboard/${overviewDashboard.id}`}
            >
              {overviewDashboard.linkLabel}
            </KuiLinkButton>
          </EuiFlexItem>

        </EuiFlexGroup>

      </div>
    );
  }
}

Footer.propTypes = {
  overviewDashboard: PropTypes.shape({
    id: PropTypes.string.isRequired,
    linkLabel: PropTypes.string.isRequired,
  })
};
