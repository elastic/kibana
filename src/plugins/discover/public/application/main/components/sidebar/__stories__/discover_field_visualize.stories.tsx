import React from 'react';
import { DiscoverFieldVisualizeInner } from '../discover_field_visualize_inner';
import { numericField as field } from './fields';

const visualizeInfo = {
  href: 'http://localhost:9001/',
  field,
};

const handleVisualizeLinkClick = () => {
  alert('Clicked');
};

export default {
  title: 'components/sidebar/DiscoverFieldVisualizeInner',
};

export const Default = () => (
  <DiscoverFieldVisualizeInner
    field={field}
    visualizeInfo={visualizeInfo}
    handleVisualizeLinkClick={handleVisualizeLinkClick}
  />
);

Default.story = {
  name: 'default',
};
