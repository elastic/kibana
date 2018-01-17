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
  let launchDashboard;
  if (overviewDashboard) {
    launchDashboard = (
      <div>
        <EuiHorizontalRule />

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">

          <EuiFlexItem grow={false}>
            <EuiText>
              <p>
                {`Once all steps are completed, you're ready to explore your data`}
              </p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem
            grow={false}
          >
            <KuiLinkButton
              buttonType="primary"
              href={`#/dashboards?title=${overviewDashboard.title}`}
            >
              {overviewDashboard.linkLabel}
            </KuiLinkButton>
          </EuiFlexItem>

        </EuiFlexGroup>

      </div>
    );
  }

  return (
    <div>
      {launchDashboard}
    </div>
  );
}

Footer.propTypes = {
  overviewDashboard: PropTypes.shape({
    title: PropTypes.string.isRequired,
    linkLabel: PropTypes.string.isRequired,
  })
};
