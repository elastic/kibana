import React from 'react';
import { View } from '../view';

export const bar = () => new View('bar', {
  displayName: 'Bar Chart',
  description: 'Show your data, as bars',
  modelArgs: ['x', 'y', 'color'],
  args: [],
  template() {
    return (
      <div>Draw bar chart</div>
    );
  },
});
