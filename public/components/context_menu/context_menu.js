import React from 'react';
import PropTypes from 'prop-types';

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
  <div className="contextMenu" onKeyDown={onKeyDown} onKeyPress={onKeyPress}>
    {children}
    {isOpen && items.length ? (
      <div className="contextMenu__items" style={itemsStyle}>
        {items.map((item, i) => (
          <div
            key={i}
            className={
              'contextMenu__item ' + (selectedIndex === i ? 'contextMenu__item-isActive' : '')
            }
            onClick={() => onSelect(item)}
            onMouseOver={() => setSelectedIndex(i)}
          >
            {itemComponent({ item })}
          </div>
        ))}
      </div>
    ) : (
      ''
    )}
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
