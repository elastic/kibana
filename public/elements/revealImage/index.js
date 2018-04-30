import header from './header.svg';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: 'Image Reveal',
  help: 'Reveals a percentage of an image',
  image: header,
  expression:
    'demodata | pointseries size="sum(min(cost) / max(cost))" | getCell | revealImage origin=bottom | render',
});
