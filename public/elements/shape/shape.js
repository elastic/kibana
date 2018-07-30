import header from './header.png';

export const shape = () => ({
  name: 'shape',
  displayName: 'Shape',
  help: 'A customizable shape',
  width: 200,
  height: 200,
  image: header,
  expression:
    'shape "square" fill="#4cbce4" border="rgba(255,255,255,0)" borderWidth=0 maintainAspect=true | render',
});
