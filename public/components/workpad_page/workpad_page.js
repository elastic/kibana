import React from 'react';
import PropTypes from 'prop-types';
import { ElementWrapper } from '../element_wrapper';
import { AlignmentGuide } from '../alignment_guide';
import { RotationHandle } from '../rotation_handle';
import { BorderConnection } from '../border_connection';
import { BorderResizeHandle } from '../border_resize_handle';

export const WorkpadPage = ({
  page,
  elements,
  height,
  width,
  isEditable,
  isSelected,
  onDoubleClick,
  onKeyDown,
  onKeyUp,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  selectedShapes,
}) => {
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
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onDoubleClick={onDoubleClick}
      tabIndex={0} // needed to capture keyboard events; focusing is also needed but React apparently does so implicitly
    >
      {elements
        .map(element => {
          const selected = selectedShapes.indexOf(element.id) !== -1;
          if (element.type === 'annotation') {
            if (!isEditable) {
              return;
            }
            switch (element.subtype) {
              case 'alignmentGuide':
                return (
                  <AlignmentGuide
                    key={element.id}
                    type={element.type}
                    transformMatrix={element.transformMatrix}
                    a={element.a}
                    b={element.b}
                  />
                );
              case 'rotationHandle':
                return (
                  <RotationHandle
                    key={element.id}
                    type={element.type}
                    transformMatrix={element.transformMatrix}
                    a={element.a}
                    b={element.b}
                  />
                );
              case 'resizeHandle':
                return (
                  <BorderResizeHandle
                    key={element.id}
                    type={element.type}
                    transformMatrix={element.transformMatrix}
                    a={element.a}
                    b={element.b}
                  />
                );
              case 'resizeConnector':
                return (
                  <BorderConnection
                    key={element.id}
                    type={element.type}
                    transformMatrix={element.transformMatrix}
                    a={element.a}
                    b={element.b}
                  />
                );
            }
          }
          return <ElementWrapper key={element.id} element={{ ...element, selected }} />;
        })
        .filter(element => !!element)}
    </div>
  );
};

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  elements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
    })
  ),
  isSelected: PropTypes.bool.isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  style: PropTypes.object,
  isEditable: PropTypes.bool.isRequired,
  onDoubleClick: PropTypes.func,
  onKeyDown: PropTypes.func,
  onKeyUp: PropTypes.func,
  onMouseDown: PropTypes.func,
  onMouseMove: PropTypes.func,
  onMouseUp: PropTypes.func,
  selectedShapes: PropTypes.arrayOf(PropTypes.string),
  shapes: PropTypes.arrayOf(PropTypes.object),
};
