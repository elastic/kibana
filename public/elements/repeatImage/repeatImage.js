import header from './header.svg';

export const repeatImage = {
  name: 'repeatImage',
  displayName: 'Image Repeat',
  help: 'ADVANCED (requires editor): Repeats an image N times',
  image: header,
  expression: 'demodata | pointseries size="mean(cost)" | getCell size | repeatImage | render',
};
