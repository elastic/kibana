import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

export const ArgAdd = ({ onValueAdd, displayName, help }) => {
  return (
    <button className="canvasArg__add" onClick={onValueAdd}>
      <EuiDescriptionList compressed>
        <EuiDescriptionListTitle>{displayName}</EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <small>{help}</small>
        </EuiDescriptionListDescription>
      </EuiDescriptionList>
    </button>
  );
};

ArgAdd.propTypes = {
  displayName: PropTypes.string,
  help: PropTypes.string,
  onValueAdd: PropTypes.func,
};
