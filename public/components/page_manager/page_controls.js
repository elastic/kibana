import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

export const PageControls = ({ pageId, onDelete, onDuplicate, movePage }) => {
  const handleDuplicate = ev => {
    ev.preventDefault();
    onDuplicate(pageId);
  };

  const handleDelete = ev => {
    ev.preventDefault();
    onDelete(pageId);
  };

  const handleMove = position => ev => {
    ev.preventDefault();
    movePage(pageId, position);
  };

  return (
    <div className="canvasPageManager__controls">
      <EuiFlexGroup gutterSize="xs" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="sortLeft"
            title="Move Left"
            aria-label="Move Left"
            onClick={ev => {
              handleMove(-1)(ev);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="danger"
            iconType="trash"
            title="Delete Page"
            aria-label="Delete Page"
            onClick={handleDelete}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="document"
            title="Duplicate Page"
            aria-label="Duplicate Page"
            onClick={handleDuplicate}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="sortRight"
            title="Move Left"
            aria-label="Move Left"
            onClick={ev => {
              handleMove(+1)(ev);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

PageControls.propTypes = {
  pageId: PropTypes.string.isRequired,
  pageNumber: PropTypes.number.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDuplicate: PropTypes.func.isRequired,
  movePage: PropTypes.func.isRequired,
};
