import React from 'react';
import PropTypes from 'prop-types';
import './suggestion.less';

export const Suggestion = ({ item }) => (
  <div className="suggestion">
    <div className="name">{item.name}</div>
    <div className="description">{item.description}</div>
  </div>
);

Suggestion.propTypes = {
  item: PropTypes.object,
};
