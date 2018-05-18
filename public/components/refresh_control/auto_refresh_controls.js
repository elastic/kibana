import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButton,
  EuiLink,
  EuiFieldText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { timeDurationString } from '../../lib/time_duration';

export const AutoRefreshControls = ({ refreshInterval, setRefresh, disableInterval }) => {
  let refreshInput;

  return (
    <div>
      {refreshInterval > 0 ? (
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <span>Interval: {timeDurationString(refreshInterval)}</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink size="xs" onClick={disableInterval}>
              Disable
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiTitle size="s">
          <div>Interval: disabled</div>
        </EuiTitle>
      )}

      <EuiSpacer size="m" />

      <EuiFlexGroup
        gutterSize="m"
        className="canvas__refresh_control--auto-refresh--preset-intervals"
      >
        <EuiFlexItem className="items">
          <EuiLink onClick={() => setRefresh(5000)}>5 Seconds</EuiLink>
          <EuiLink onClick={() => setRefresh(15000)}>15 Seconds</EuiLink>
          <EuiLink onClick={() => setRefresh(30000)}>30 Seconds</EuiLink>
          <EuiLink onClick={() => setRefresh(60000)}>1 Minute</EuiLink>
          <EuiLink onClick={() => setRefresh(300000)}>5 Minutes</EuiLink>
          <EuiLink onClick={() => setRefresh(900000)}>15 Minutes</EuiLink>
        </EuiFlexItem>
        <EuiFlexItem className="items">
          <EuiLink onClick={() => setRefresh(1800000)}>30 Minutes</EuiLink>
          <EuiLink onClick={() => setRefresh(3600000)}>1 Hour</EuiLink>
          <EuiLink onClick={() => setRefresh(7200000)}>2 Hours</EuiLink>
          <EuiLink onClick={() => setRefresh(21600000)}>6 Hours</EuiLink>
          <EuiLink onClick={() => setRefresh(43200000)}>12 Hours</EuiLink>
          <EuiLink onClick={() => setRefresh(86400000)}>24 Hours</EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <form
        onSubmit={ev => {
          ev.preventDefault();
          setRefresh(refreshInput.value);
        }}
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
          <EuiFlexItem>
            <EuiFormRow label="Custom Interval">
              <EuiFieldText inputRef={i => (refreshInput = i)} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton className="canvas__refresh_control--auto-refresh--submit" type="submit">
              Set
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </form>
    </div>
  );
};

AutoRefreshControls.propTypes = {
  refreshInterval: PropTypes.number,
  setRefresh: PropTypes.func.isRequired,
  disableInterval: PropTypes.func.isRequired,
};
