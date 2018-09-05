import React from 'react';
import PropTypes from 'prop-types';
import { EuiFlexGrid, EuiFlexItem, EuiLink } from '@elastic/eui';
import { shapes } from '../../../canvas_plugin_src/renderers/shape/shapes';
import { ShapePreview } from '../shape_preview';

export const ShapePicker = ({ onChange }) => {
  return (
    <EuiFlexGrid gutterSize="s" columns={4}>
      {Object.keys(shapes)
        .sort()
        .map(shapeKey => (
          <EuiFlexItem key={shapeKey}>
            <EuiLink onClick={() => onChange(shapeKey)}>
              <ShapePreview value={shapeKey} />
            </EuiLink>
          </EuiFlexItem>
        ))}
    </EuiFlexGrid>
  );
};

ShapePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
};
