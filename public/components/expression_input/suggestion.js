import React from 'react';
import PropTypes from 'prop-types';

export const Suggestion = ({ item }) => (
  <div className="suggestion">
    <div className="name">{item.name}</div>
    <div className="description">{item.description}</div>
  </div>
);

Suggestion.propTypes = {
  item: PropTypes.object,
};
