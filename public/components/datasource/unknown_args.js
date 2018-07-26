import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';

export const UnknownArgs = ({ unknownArgs, done }) => (
  <EuiPanel>
    <EuiText>
      <h4>Unknown Arguments Found</h4>
      <p>
        There are arguments in the expression that can not be converting into an interface. Use the
        expression editor to update the datasource.
      </p>
    </EuiText>

    <EuiSpacer size="m" />

    <EuiText>
      <p>The following unknown arguments were found:</p>
      <ul>{unknownArgs.map(name => <li key={name}>{name}</li>)}</ul>
    </EuiText>

    <EuiSpacer size="m" />

    <EuiButton size="s" fill onClick={done}>
      Close
    </EuiButton>
  </EuiPanel>
);

UnknownArgs.propTypes = {
  done: PropTypes.func,
  unknownArgs: PropTypes.array,
};
