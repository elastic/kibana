import { View } from '../view';

export const grid = () => new View('grid', {
  displayName: 'Number or Text Grid',
  description: '',
  modelArgs: ['x', 'y', 'color', 'size', 'text'],
  args: [],
});
