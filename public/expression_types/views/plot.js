import React from 'react';
import { View } from '../view';

export const plot = () => new View('plot', {
  displayName: 'Plot Chart',
  description: 'Show your data, as plots',
  modelArgs: ['x', 'y', 'color'],
  args: [],
  template() {
    return (
      <div>Draw plot chart</div>
    );
  },
});
