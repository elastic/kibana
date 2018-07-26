export const repeatImage = () => ({
  name: 'repeatImage',
  displayName: 'Image Repeat',
  help: 'Repeats an image N times',
  expression: `demodata
| math "mean(cost)"
| repeatImage image=null
| render`,
});
