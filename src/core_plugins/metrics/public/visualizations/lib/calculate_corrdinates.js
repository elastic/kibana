import { findDOMNode } from 'react-dom';
import calcDimensions from './calc_dimensions';
export default function calculateCorrdinates(innerRef, resizeRef, state) {
  const inner = findDOMNode(innerRef);
  const resize = findDOMNode(resizeRef);
  let scale = state.scale;

  // Let's start by scaling to the largest dimension
  if (resize.clientWidth - resize.clientHeight < 0) {
    scale = resize.clientWidth / inner.clientWidth;
  } else {
    scale = resize.clientHeight / inner.clientHeight;
  }
  let [ newWidth, newHeight ] = calcDimensions(inner, scale);

  // Now we need to check to see if it will still fit
  if (newWidth > resize.clientWidth) {
    scale = resize.clientWidth / inner.clientWidth;
  }
  if (newHeight > resize.clientHeight) {
    scale = resize.clientHeight / inner.clientHeight;
  }

  // Calculate the final dimensions
  [ newWidth, newHeight ] = calcDimensions(inner, scale);

  // Because scale is middle out we need to translate
  // the new X,Y corrdinates
  const translateX = (newWidth - inner.clientWidth) / 2;
  const translateY = (newHeight - inner.clientHeight) / 2;

  // Center up and down
  const top = Math.floor((resize.clientHeight - newHeight) / 2);
  const left = Math.floor((resize.clientWidth - newWidth) / 2);

  return { scale, top, left, translateY, translateX };

}
