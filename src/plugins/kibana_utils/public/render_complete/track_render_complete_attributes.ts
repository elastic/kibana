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

/**
 * If this attribute is present it specifies that `renderComplete` event has
 * not been fired yet.
 */
const ATTR_DATA_LOADING = 'data-loading';

/**
 * Tracks number of times `renderComplete` event was fired.
 */
const ATTR_DATA_RENDERING_COUNT = 'data-rendering-count';

/**
 * DOM data attribute that can take values `disabled`, `false` and `true`.
 *
 * - `disabled` -- Reporting will not wait for `renderComplete` event, instead
 *   it will just wait for some timeout, and assume this item is rendered.
 * - `false` -- Reporting will subscribe to `renderComplete` event for this item.
 * - any other value -- Reporting will assume that this element has already
 *   completed rendering.
 */
const ATTR_DATA_RENDER_COMPLETE = 'data-render-complete';

/**
 * Reporting uses this selector to listen for `renderComplete` events
 * and check `data-render-complete` attributes.
 */
const ATTR_DATA_SHARED_ITEM = 'data-shared-item';

/**
 * Call this function on any reporting element that needs to appear in reporting
 * screenshot. After some time you also must call `updateRenderCompleteAttrs`
 * functions, otherwise reporting will hang forever when taking screenshot.
 */
export const setInitialRenderCompleteAttrs = (el: HTMLElement) => {
  el.setAttribute(ATTR_DATA_SHARED_ITEM, '');
  el.setAttribute(ATTR_DATA_LOADING, '');
  el.setAttribute(ATTR_DATA_RENDERING_COUNT, '0');
  el.setAttribute(ATTR_DATA_RENDER_COMPLETE, 'false');
};

/**
 * Call this method when element `el` has rendered and is ready for reporting
 * to take screenshot. You can also call it every time it re-renders.
 */
export const updateRenderCompleteAttrs = (el: HTMLElement) => {
  el.removeAttribute(ATTR_DATA_LOADING);
  el.setAttribute(ATTR_DATA_RENDER_COMPLETE, 'true');
  el.setAttribute(
    ATTR_DATA_RENDERING_COUNT,
    String(1 + Number(el.getAttribute(ATTR_DATA_RENDERING_COUNT) || 0))
  );
};
