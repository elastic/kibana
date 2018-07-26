import React from 'react';
import PropTypes from 'prop-types';
import { EuiCard, EuiIcon } from '@elastic/eui';

export const DatasourceSelector = ({ onSelect, datasources }) => (
  <div>
    {datasources.map(d => (
      <EuiCard
        key={d.name}
        title={d.displayName}
        icon={<EuiIcon type={d.image} size="xxl" />}
        onClick={() => onSelect(d.name)}
        description={d.help}
        layout="horizontal"
        className="canvasDataSource__card"
      />
    ))}
  </div>
);

DatasourceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  datasources: PropTypes.array.isRequired,
};
