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

import { assign } from 'lodash';
import { IndexedArray } from '../../../../legacy/ui/public/indexed_array';

const listeners = [];

export class ManagementSection {
  /**
   * @param {string} id
   * @param {object} options
   * @param {number|null} options.order
   * @param {string|null} options.display - defaults to id
   * @param {string|null} options.url - defaults to ''
   * @param {boolean|null} options.visible - defaults to true
   * @param {boolean|null} options.disabled - defaults to false
   * @param {string|null} options.tooltip - defaults to ''
   * @param {string|null} options.icon - defaults to ''
   * @returns {ManagementSection}
   */

  constructor(id, options = {}, capabilities) {
    this.display = id;
    this.id = id;
    this.items = new IndexedArray({
      index: ['id'],
      order: ['order'],
    });
    this.visible = true;
    this.disabled = false;
    this.tooltip = '';
    this.icon = '';
    this.url = '';
    this.capabilities = capabilities;

    assign(this, options);
  }

  get visibleItems() {
    // console.log('CAPABILITIES', capabilities.get().management);
    return this.items.inOrder.filter(item => {
      const capabilityManagementSection = this.capabilities.management[this.id];
      const itemCapability = capabilityManagementSection
        ? capabilityManagementSection[item.id]
        : null;

      return item.visible && itemCapability !== false;
    });
  }

  /**
   * Registers a callback that will be executed when management sections are updated
   * Globally bound to solve for sidebar nav needs
   *
   * @param {function} fn
   */
  addListener(fn) {
    listeners.push(fn);
  }

  /**
   * Registers a sub-section
   *
   * @param {string} id
   * @param {object} options
   * @returns {ManagementSection}
   */

  register(id, options = {}) {
    const item = new ManagementSection(id, assign(options, { parent: this }), this.capabilities);

    if (this.hasItem(id)) {
      throw new Error(`'${id}' is already registered`);
    }

    this.items.push(item);
    listeners.forEach(fn => fn());

    return item;
  }

  /**
   * Deregisters a section
   *
   * @param {string} id
   */
  deregister(id) {
    this.items.remove(item => item.id === id);
    listeners.forEach(fn => fn(this.items));
  }

  /**
   * Determine if an id is already registered
   *
   * @param {string} id
   * @returns {boolean}
   */

  hasItem(id) {
    return this.items.byId.hasOwnProperty(id);
  }

  /**
   * Fetches a section by id
   *
   * @param {string} id
   * @returns {ManagementSection}
   */

  getSection(id) {
    if (!id) {
      return;
    }

    const sectionPath = id.split('/');
    return sectionPath.reduce((currentSection, nextSection) => {
      if (!currentSection) {
        return;
      }

      return currentSection.items.byId[nextSection];
    }, this);
  }

  hide() {
    this.visible = false;
  }

  show() {
    this.visible = true;
  }

  disable() {
    this.disabled = true;
  }

  enable() {
    this.disabled = false;
  }
}
