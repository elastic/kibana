import React from 'react';
import PropTypes from 'prop-types';
import { Popover, OverlayTrigger } from 'react-bootstrap';
import { ItemGrid } from '../item_grid';
import './shape_picker.less';

const icons = [
  'circle',
  'star',
  'user',
  'smile-o',
  'play',
  'paper-plane',

  'circle-o',
  'star-o',
  'users',
  'frown-o',
  'play-circle',
  'paper-plane-o',

  'heart',
  'info-circle',
  'image',
  'puzzle-piece',
  'tags',
  'bank',

  'globe',
  'asterisk',
  'cloud',
  'eye',
  'shield',
  'automobile',
];

const picker = (value, onSelect) => (
  <Popover id="shape-picker-popover" style={{ width: 240 }}>
    <div className="canvas__shape-picker-items">
      <ItemGrid items={icons} itemsPerRow="6">
        {({ item }) => (
          <div
            key={item}
            className={`canvas__shape-picker-item ${(item === value) ? 'selected' : ''}`}
            onClick={() => onSelect(item)}
          >
            <span className={`fa fa-${item}`} />
          </div>
        )}
      </ItemGrid>
    </div>
  </Popover>
);

export const ShapePicker = ({ placement, value, onSelect }) => (
  <div className="canvas__shape-picker">
    <OverlayTrigger
      rootClose
      overlay={picker(value, onSelect)}
      placement={placement || 'bottom'}
      trigger="click"
    >
      <div className="canvas__shape-picker-preview">
        <span className={`fa fa-${value}`} />
      </div>
    </OverlayTrigger>
  </div>
);

ShapePicker.propTypes = {
  placement: PropTypes.string,
  value: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};
