import React from 'react';
import { PropTypes } from 'prop-types';
import './page.less';
import { ElementWrapper } from '../element_wrapper';

export const PageStack = ({ pages, selectedPageId, height, width }) => {
  return pages.map(page => (
    <div
      key={page.id}
      id={page.id}
      className="canvas__page"
      style={{
        top: selectedPageId === page.id ? undefined : '-9999999px',
        left: selectedPageId === page.id ? undefined : '-9999999px',
        height,
        width,
      }}
    >
      {page.elements.map(element => <ElementWrapper key={element.id} element={element} />)}
    </div>
  ));
};

PageStack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  pages: PropTypes.array.isRequired,
  selectedPageId: PropTypes.string.isRequired,
};
