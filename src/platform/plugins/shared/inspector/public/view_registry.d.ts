import { EventEmitter } from 'events';
import type { InspectorViewDescription } from './types';
import type { Adapters } from '../common';
/**
 * @callback viewShouldShowFunc
 * @param {object} adapters - A list of adapters to check whether or not this view
 *    should be shown for.
 * @returns {boolean} true - if this view should be shown for the given adapters.
 */
/**
 * A registry that will hold inspector views.
 */
export declare class InspectorViewRegistry extends EventEmitter {
    private views;
    /**
     * Register a new inspector view to the registry. Check the README.md in the
     * inspector directory for more information of the object format to register
     * here. This will also emit a 'change' event on the registry itself.
     *
     * @param {InspectorViewDescription} view - The view description to add to the registry.
     */
    register(view: InspectorViewDescription): void;
    /**
     * Retrieve all views currently registered with the registry.
     * @returns {InspectorViewDescription[]} A by `order` sorted list of all registered
     *    inspector views.
     */
    getAll(): InspectorViewDescription[];
    /**
     * Retrieve all registered views, that want to be visible for the specified adapters.
     * @param {object} adapters - an adapter configuration
     * @returns {InspectorViewDescription[]} All inespector view descriptions visible
     *    for the specific adapters.
     */
    getVisible(adapters?: Adapters): InspectorViewDescription[];
}
