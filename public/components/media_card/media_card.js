import React from 'react';
import PropTypes from 'prop-types';
import './media_card.less';

const noop = () => {};

export const MediaCard = ({ image, children, title, onClick }) => {
  const classes = ['canvas__media_card'];
  if (onClick) classes.push('canvas__media_card_clickable');

  return (
    <div className={classes.join(' ')} onClick={onClick || noop}>
      <div
        className="canvas__media_card-image"
        style={{ backgroundImage: `url(${image})` }}/>

      <div className="canvas__media_card-content">
        <h4 className="canvas__media_card-title">{title}</h4>
        { children }
      </div>
    </div>
  );
};

MediaCard.propTypes = {
  image: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
};
