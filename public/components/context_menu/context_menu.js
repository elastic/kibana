import React from 'react';
import PropTypes from 'prop-types';
import './context_menu.less';

export const ContextMenu = ({
  items,
  onSelect,
  itemsStyle,
  itemComponent,
  children,
  isOpen,
  selectedIndex,
  setSelectedIndex,
  onKeyDown,
  onKeyPress,
}) => (
  <div
    className="contextMenu"
    onKeyDown={onKeyDown}
    onKeyPress={onKeyPress}
  >
    {children}
    {isOpen && items.length ? (
      <div
        className="contextMenuItems"
        style={itemsStyle}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className={'contextMenuItem ' + (selectedIndex === i ? 'active' : '')}
            onClick={() => onSelect(item)}
            onMouseOver={() => setSelectedIndex(i)}
          >
            {itemComponent({ item })}
          </div>
        ))}
      </div>
    ) : ''}
  </div>
);

ContextMenu.propTypes = {
  items: PropTypes.array,
  onSelect: PropTypes.func,
  itemsStyle: PropTypes.object,
  itemComponent: PropTypes.func,
  children: PropTypes.node,
  isOpen: PropTypes.bool,
  selectedIndex: PropTypes.number,
  setSelectedIndex: PropTypes.func,
  onKeyDown: PropTypes.func,
  onKeyPress: PropTypes.func,
};
