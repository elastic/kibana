import React from 'react';
import { View } from '../view';

export const line = () => new View('line', {
  displayName: 'Line Chart',
  description: 'Show your data, as lines',
  modelArgs: ['x', 'y'],
  args: [],
  template() {
    return (
      <div>Draw line chart</div>
    );
  },
});
