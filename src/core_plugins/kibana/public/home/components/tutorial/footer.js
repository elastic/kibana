import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
  EuiButton,
} from '@elastic/eui';

export function Footer({ overviewDashboard, launchApp }) {
  if (overviewDashboard || launchApp) {
    let button;
    if (launchApp) {
      button = (
        <EuiButton
          fill
          href={launchApp.url}
        >
          {launchApp.label}
        </EuiButton>
      );
    } else {
      button = (
        <EuiButton
          fill
          href={`#/dashboard/${overviewDashboard.id}`}
        >
          {overviewDashboard.linkLabel}
        </EuiButton>
      );
    }
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
            {button}
          </EuiFlexItem>

        </EuiFlexGroup>

      </div>
    );
  }
}

Footer.propTypes = {
  launchApp: PropTypes.shape({
    url: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }),
  overviewDashboard: PropTypes.shape({
    id: PropTypes.string.isRequired,
    linkLabel: PropTypes.string.isRequired,
  })
};
