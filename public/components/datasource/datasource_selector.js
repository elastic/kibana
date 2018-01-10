import React from 'react';
import PropTypes from 'prop-types';
import { MediaCard } from '../media_card';

export const DatasourceSelector = ({ onSelect, datasources }) => (
  <div>
    {datasources.map(d => (
      <MediaCard
        key={d.name}
        title={d.displayName}
        image={d.image}
        onClick={() => onSelect(d.name)}
      >
        {d.function.help}
      </MediaCard>
    ))}
  </div>
);

DatasourceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  datasources: PropTypes.array.isRequired,
};
