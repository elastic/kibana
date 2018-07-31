import React from 'react';
import PropTypes from 'prop-types';
import { ElementWrapper } from '../element_wrapper';
import { AlignmentGuide } from '../alignment_guide';
import { HoverAnnotation } from '../hover_annotation';
import { RotationHandle } from '../rotation_handle';
import { BorderConnection } from '../border_connection';
import { BorderResizeHandle } from '../border_resize_handle';

// NOTE: the data-shared-* attributes here are used for reporting
export const WorkpadPage = ({
  page,
  elements,
  cursor = 'auto',
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
}) => {
  const activeClass = isSelected ? 'canvasPage--isActive' : 'canvasPage--isInactive';

  return (
    <div
      key={page.id}
      id={page.id}
      className={`canvasPage ${activeClass}`}
      data-shared-items-container
      style={{
        ...page.style,
        height,
        width,
        cursor,
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
          if (element.type === 'annotation') {
            if (!isEditable) return;

            const props = {
              key: element.id,
              type: element.type,
              transformMatrix: element.transformMatrix,
              a: element.a,
              b: element.b,
            };

            switch (element.subtype) {
              case 'alignmentGuide':
                return <AlignmentGuide {...props} />;
              case 'hoverAnnotation':
                return <HoverAnnotation {...props} />;
              case 'rotationHandle':
                return <RotationHandle {...props} />;
              case 'resizeHandle':
                return <BorderResizeHandle {...props} />;
              case 'resizeConnector':
                return <BorderConnection {...props} />;
              default:
                return [];
            }
          } else {
            return <ElementWrapper key={element.id} element={element} />;
          }
        })
        .filter(element => !!element)}
    </div>
  );
};

WorkpadPage.propTypes = {
  page: PropTypes.shape({
    id: PropTypes.string.isRequired,
    style: PropTypes.object,
  }).isRequired,
  elements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      transformMatrix: PropTypes.arrayOf(PropTypes.number).isRequired,
      a: PropTypes.number.isRequired,
      b: PropTypes.number.isRequired,
      type: PropTypes.string,
    })
  ).isRequired,
  cursor: PropTypes.string,
  isSelected: PropTypes.bool.isRequired,
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
  isEditable: PropTypes.bool.isRequired,
  onDoubleClick: PropTypes.func,
  onKeyDown: PropTypes.func,
  onKeyUp: PropTypes.func,
  onMouseDown: PropTypes.func,
  onMouseMove: PropTypes.func,
  onMouseUp: PropTypes.func,
};
