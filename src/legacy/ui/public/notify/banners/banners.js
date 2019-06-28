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
 * Banners represents a prioritized list of displayed components.
 */
export class Banners {

  constructor() {
    // sorted in descending order (100, 99, 98...) so that higher priorities are in front
    this.list = [];
    this.uniqueId = 0;
    this.onChangeCallback = null;
  }

  _changed = () => {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  _remove = id => {
    const index = this.list.findIndex(details => details.id === id);

    if (index !== -1) {
      this.list.splice(index, 1);

      return true;
    }

    return false;
  }

  /**
   * Set the {@code callback} to invoke whenever changes are made to the banner list.
   *
   * Use {@code null} or {@code undefined} to unset it.
   *
   * @param {Function} callback The callback to use.
   */
  onChange = callback => {
    this.onChangeCallback = callback;
  }

  /**
   * Add a new banner.
   *
   * @param {Object} component The React component to display.
   * @param {Number} priority The optional priority order to display this banner. Higher priority values are shown first.
   * @return {String} A newly generated ID. This value can be used to remove/replace the banner.
   */
  add = ({ component, priority = 0 }) => {
    const id = `${++this.uniqueId}`;
    const bannerDetails = { id, component, priority };

    // find the lowest priority item to put this banner in front of
    const index = this.list.findIndex(details => priority > details.priority);

    if (index !== -1) {
      // we found something with a lower priority; so stick it in front of that item
      this.list.splice(index, 0, bannerDetails);
    } else {
      // nothing has a lower priority, so put it at the end
      this.list.push(bannerDetails);
    }

    this._changed();

    return id;
  }

  /**
   * Remove an existing banner.
   *
   * @param {String} id The ID of the banner to remove.
   * @return {Boolean} {@code true} if the ID is recognized and the banner is removed. {@code false} otherwise.
   */
  remove = id => {
    const removed = this._remove(id);

    if (removed) {
      this._changed();
    }

    return removed;
  }

  /**
   * Replace an existing banner by removing it, if it exists, and adding a new one in its place.
   *
   * This is similar to calling banners.remove, followed by banners.add, except that it only notifies the listener
   * after adding.
   *
   * @param {Object} component The React component to display.
   * @param {String} id The ID of the Banner to remove.
   * @param {Number} priority The optional priority order to display this banner. Higher priority values are shown first.
   * @return {String} A newly generated ID. This value can be used to remove/replace the banner.
   */
  set = ({ component, id, priority = 0 }) => {
    this._remove(id);

    return this.add({ component, priority });
  }

}

/**
 * A singleton instance meant to represent all Kibana banners.
 */
export const banners = new Banners();
