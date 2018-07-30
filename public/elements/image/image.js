import header from './header.png';

export const image = () => ({
  name: 'image',
  displayName: 'Image',
  help: 'A static image.',
  image: header,
  expression: `image mode="contain"
| render`,
});
