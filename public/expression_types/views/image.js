import React from 'react';
import { View } from '../view';

export const image = () => new View('image', {
  displayName: 'Image',
  description: 'Display an image',
  modelArgs: [],
  args: [],
  template() {
    return (
      <div>image here...</div>
    );
  },
});
