import header from './header.svg';

export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: 'Image Repeat',
  help: 'Repeats an image N times',
  image: header,
  expression: `demodata
| math "mean(cost)"
| repeatImage image=null
| render`,
});
