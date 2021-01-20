/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EventEmitter } from 'events';
import { InspectorViewDescription } from './types';
import { Adapters } from '../common';

/**
 * @callback viewShouldShowFunc
 * @param {object} adapters - A list of adapters to check whether or not this view
 *    should be shown for.
 * @returns {boolean} true - if this view should be shown for the given adapters.
 */

/**
 * A registry that will hold inspector views.
 */
export class InspectorViewRegistry extends EventEmitter {
  private views: InspectorViewDescription[] = [];

  /**
   * Register a new inspector view to the registry. Check the README.md in the
   * inspector directory for more information of the object format to register
   * here. This will also emit a 'change' event on the registry itself.
   *
   * @param {InspectorViewDescription} view - The view description to add to the registry.
   */
  public register(view: InspectorViewDescription): void {
    if (!view) {
      return;
    }
    this.views.push(view);
    // Keep registry sorted by the order property
    this.views.sort((a, b) => (a.order || Number.MAX_VALUE) - (b.order || Number.MAX_VALUE));
    this.emit('change');
  }

  /**
   * Retrieve all views currently registered with the registry.
   * @returns {InspectorViewDescription[]} A by `order` sorted list of all registered
   *    inspector views.
   */
  public getAll(): InspectorViewDescription[] {
    return this.views;
  }

  /**
   * Retrieve all registered views, that want to be visible for the specified adapters.
   * @param {object} adapters - an adapter configuration
   * @returns {InspectorViewDescription[]} All inespector view descriptions visible
   *    for the specific adapters.
   */
  public getVisible(adapters?: Adapters): InspectorViewDescription[] {
    if (!adapters) {
      return [];
    }
    return this.views.filter((view) => !view.shouldShow || view.shouldShow(adapters));
  }
}
