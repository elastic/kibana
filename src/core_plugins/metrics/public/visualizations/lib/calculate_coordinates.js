/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { findDOMNode } from 'react-dom';
import calcDimensions from './calc_dimensions';
export default function calculateCoordinates(innerRef, resizeRef, state) {
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
  // the new X,Y coordinates
  const translateX = (newWidth - inner.clientWidth) / 2;
  const translateY = (newHeight - inner.clientHeight) / 2;

  // Center up and down
  const top = Math.floor((resize.clientHeight - newHeight) / 2);
  const left = Math.floor((resize.clientWidth - newWidth) / 2);

  return { scale, top, left, translateY, translateX };

}
