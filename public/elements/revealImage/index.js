import header from './header.png';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: 'Image Reveal',
  help: 'Reveals a percentage of an image',
  image: header,
  expression: `filters
| demodata
| math "sum(min(cost) / max(cost))"
| revealImage origin=bottom image=null
| render`,
});
