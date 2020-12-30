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

import React from 'react';

/**
 * Returns true if any modifier key is active on the event, false otherwise.
 */
export const hasActiveModifierKey = (event: React.MouseEvent): boolean => {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
};

/**
 * Returns the closest anchor (`<a>`) element in the element parents (self included) up to the given container (excluded), or undefined if none is found.
 */
export const getClosestLink = (
  element: HTMLElement,
  container?: HTMLElement
): HTMLAnchorElement | undefined => {
  let current = element;
  while (true) {
    if (current.tagName.toLowerCase() === 'a') {
      return current as HTMLAnchorElement;
    }
    const parent = current.parentElement;
    if (!parent || parent === document.body || parent === container) {
      break;
    }
    current = parent;
  }
  return undefined;
};
