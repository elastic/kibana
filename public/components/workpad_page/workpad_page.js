import React from 'react';
import { PropTypes } from 'prop-types';
import { ElementWrapper } from '../element_wrapper';
import './workpad_page.less';

// NOTE: the data-shared-* attributes here are used for reporting
export const WorkpadPage = ({ page, isSelected, height, width }) => {
  const activeClass = isSelected ? 'canvas__page--active' : 'canvas__page--inactive';

  return (
    <div
      key={page.id}
      id={page.id}
      className={`canvas__page ${activeClass}`}
      data-shared-items-container
      style={{
        ...page.style,
        height,
        width,
      }}
    >
      {page.elements.map(element => <ElementWrapper key={element.id} element={element} />)}
    </div>
  );
};

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
    elements: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
      })
    ),
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
};
