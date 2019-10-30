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
import ReactDOM from 'react-dom';
import { npStart } from 'ui/new_platform';
import { I18nProvider } from '@kbn/i18n/react';

const npBanners = npStart.core.overlays.banners;

/** compatibility layer for new platform */
const mountForComponent = (component: React.ReactElement) => (element: HTMLElement) => {
  ReactDOM.render(<I18nProvider>{component}</I18nProvider>, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};

/**
 * Banners represents a prioritized list of displayed components.
 */
export class Banners {
  /**
   * Add a new banner.
   *
   * @param {Object} component The React component to display.
   * @param {Number} priority The optional priority order to display this banner. Higher priority values are shown first.
   * @return {String} A newly generated ID. This value can be used to remove/replace the banner.
   */
  add = ({ component, priority }: { component: React.ReactElement; priority?: number }) => {
    return npBanners.add(mountForComponent(component), priority);
  };

  /**
   * Remove an existing banner.
   *
   * @param {String} id The ID of the banner to remove.
   * @return {Boolean} {@code true} if the ID is recognized and the banner is removed. {@code false} otherwise.
   */
  remove = (id: string): boolean => {
    return npBanners.remove(id);
  };

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
  set = ({
    component,
    id,
    priority = 0,
  }: {
    component: React.ReactElement;
    id: string;
    priority?: number;
  }): string => {
    return npBanners.replace(id, mountForComponent(component), priority);
  };
}

/**
 * A singleton instance meant to represent all Kibana banners.
 */
export const banners = new Banners();
