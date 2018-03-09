import React from 'react';
import PropTypes from 'prop-types';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

export const Header = ({ addScriptedFieldUrl }) => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiTitle size="s">
        <h3>Scripted fields</h3>
      </EuiTitle>
      <EuiText>
        <p>
          You can use scripted fields in visualizations and display them in your documents.
          However, you cannot search scripted fields.
        </p>
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiButton
        data-test-subj="addScriptedFieldLink"
        href={addScriptedFieldUrl}
      >
        Add scripted field
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);

Header.propTypes = {
  addScriptedFieldUrl: PropTypes.string.isRequired,
};
