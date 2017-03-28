export default function calcDimensions(el, scale) {
  const newWidth = Math.floor(el.clientWidth * scale);
  const newHeight = Math.floor(el.clientHeight * scale);
  return [newWidth, newHeight];
}
