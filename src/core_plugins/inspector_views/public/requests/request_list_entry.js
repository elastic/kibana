import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { RequestStatus } from 'ui/inspector/adapters';


function RequestListEntry({ request, onClick, isSelected }) {
  const status = request.response ? request.response.status : null;

  return (
    <li>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={isSelected ? 'arrowRight' : 'empty'}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiLink
            className="requests-inspector__req-name"
            color="primary"
            onClick={onClick}
          >
            { request.name }
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          { status &&
            <EuiBadge
              color={status === RequestStatus.OK ? 'secondary' : 'danger'}
              iconType={status === RequestStatus.OK ? 'check' : 'cross'}
            >
              {request.time}ms
            </EuiBadge>
          }
          { !status && <EuiLoadingSpinner size="m" /> }
        </EuiFlexItem>
      </EuiFlexGroup>
    </li>
  );
}

RequestListEntry.propTypes = {
  onClick: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
};

export { RequestListEntry };
