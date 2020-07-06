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

import {
  History,
  Path,
  LocationDescriptorObject,
  TransitionPromptHook,
  UnregisterCallback,
  LocationListener,
  Location,
  Href,
  Action,
} from 'history';

/**
 * A wrapper around a `History` instance that is scoped to a particular base path of the history stack. Behaves
 * similarly to the `basename` option except that this wrapper hides any history stack entries from outside the scope
 * of this base path.
 *
 * This wrapper also allows Core and Plugins to share a single underlying global `History` instance without exposing
 * the history of other applications.
 *
 * The {@link ScopedHistory.createSubHistory | createSubHistory} method is particularly useful for applications that
 * contain any number of "sub-apps" which should not have access to the main application's history or basePath.
 *
 * @public
 */
export class ScopedHistory<HistoryLocationState = unknown>
  implements History<HistoryLocationState> {
  /**
   * Tracks whether or not the user has left this history's scope. All methods throw errors if called after scope has
   * been left.
   */
  private isActive = true;
  /**
   * All active listeners on this history instance.
   */
  private listeners = new Set<LocationListener<HistoryLocationState>>();
  /**
   * Array of the local history stack. Only stores {@link Location.key} to use tracking an index of the current
   * position of the window in the history stack.
   */
  private locationKeys: Array<string | undefined> = [];
  /**
   * The key of the current position of the window in the history stack.
   */
  private currentLocationKeyIndex: number = 0;

  constructor(private readonly parentHistory: History, private readonly basePath: string) {
    const parentPath = this.parentHistory.location.pathname;
    if (!parentPath.startsWith(basePath)) {
      throw new Error(
        `Browser location [${parentPath}] is not currently in expected basePath [${basePath}]`
      );
    }

    this.locationKeys.push(this.parentHistory.location.key);
    this.setupHistoryListener();
  }

  /**
   * Creates a `ScopedHistory` for a subpath of this `ScopedHistory`. Useful for applications that may have sub-apps
   * that do not need access to the containing application's history.
   *
   * @param basePath the URL path scope for the sub history
   */
  public createSubHistory = <SubHistoryLocationState = unknown>(
    basePath: string
  ): ScopedHistory<SubHistoryLocationState> => {
    return new ScopedHistory<SubHistoryLocationState>(this, basePath);
  };

  /**
   * The number of entries in the history stack, including all entries forwards and backwards from the current location.
   */
  public get length() {
    this.verifyActive();
    return this.locationKeys.length;
  }

  /**
   * The current location of the history stack.
   */
  public get location() {
    this.verifyActive();
    return this.stripBasePath(this.parentHistory.location);
  }

  /**
   * The last action dispatched on the history stack.
   */
  public get action() {
    this.verifyActive();
    return this.parentHistory.action;
  }

  /**
   * Pushes a new location onto the history stack. If there are forward entries in the stack, they will be removed.
   *
   * @param pathOrLocation a string or location descriptor
   * @param state
   */
  public push = (
    pathOrLocation: Path | LocationDescriptorObject<HistoryLocationState>,
    state?: HistoryLocationState
  ): void => {
    this.verifyActive();
    if (typeof pathOrLocation === 'string') {
      this.parentHistory.push(this.prependBasePath(pathOrLocation), state);
    } else {
      this.parentHistory.push(this.prependBasePath(pathOrLocation));
    }
  };

  /**
   * Replaces the current location in the history stack. Does not remove forward or backward entries.
   *
   * @param pathOrLocation a string or location descriptor
   * @param state
   */
  public replace = (
    pathOrLocation: Path | LocationDescriptorObject<HistoryLocationState>,
    state?: HistoryLocationState
  ): void => {
    this.verifyActive();
    if (typeof pathOrLocation === 'string') {
      this.parentHistory.replace(this.prependBasePath(pathOrLocation), state);
    } else {
      this.parentHistory.replace(this.prependBasePath(pathOrLocation));
    }
  };

  /**
   * Send the user forward or backwards in the history stack.
   *
   * @param n number of positions in the stack to go. Negative numbers indicate number of entries backward, positive
   *          numbers for forwards. If passed 0, the current location will be reloaded. If `n` exceeds the number of
   *          entries available, this is a no-op.
   */
  public go = (n: number): void => {
    this.verifyActive();
    if (n === 0) {
      this.parentHistory.go(n);
    } else if (n < 0) {
      if (this.currentLocationKeyIndex + 1 + n >= 1) {
        this.parentHistory.go(n);
      }
    } else if (n <= this.currentLocationKeyIndex + this.locationKeys.length - 1) {
      this.parentHistory.go(n);
    }
    // no-op if no conditions above are met
  };

  /**
   * Send the user one location back in the history stack. Equivalent to calling
   * {@link ScopedHistory.go | ScopedHistory.go(-1)}. If no more entries are available backwards, this is a no-op.
   */
  public goBack = () => {
    this.verifyActive();
    this.go(-1);
  };

  /**
   * Send the user one location forward in the history stack. Equivalent to calling
   * {@link ScopedHistory.go | ScopedHistory.go(1)}. If no more entries are available forwards, this is a no-op.
   */
  public goForward = () => {
    this.verifyActive();
    this.go(1);
  };

  /**
   * Not supported. Use {@link AppMountParameters.onAppLeave}.
   *
   * @remarks
   * We prefer that applications use the `onAppLeave` API because it supports a more graceful experience that prefers
   * a modal when possible, falling back to a confirm dialog box in the beforeunload case.
   */
  public block = (
    prompt?: boolean | string | TransitionPromptHook<HistoryLocationState>
  ): UnregisterCallback => {
    throw new Error(
      `history.block is not supported. Please use the AppMountParameters.onAppLeave API.`
    );
  };

  /**
   * Adds a listener for location updates.
   *
   * @param listener a function that receives location updates.
   * @returns an function to unsubscribe the listener.
   */
  public listen = (
    listener: (location: Location<HistoryLocationState>, action: Action) => void
  ): UnregisterCallback => {
    this.verifyActive();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Creates an href (string) to the location.
   * If `prependBasePath` is true (default), it will prepend the location's path with the scoped history basePath.
   *
   * @param location
   * @param prependBasePath
   */
  public createHref = (
    location: LocationDescriptorObject<HistoryLocationState>,
    { prependBasePath = true }: { prependBasePath?: boolean } = {}
  ): Href => {
    this.verifyActive();
    if (prependBasePath) {
      location = this.prependBasePath(location);
      if (location.pathname === undefined) {
        // we always want to create an url relative to the basePath
        // so if pathname is not present, we use the history's basePath as default
        // we are doing that here because `prependBasePath` should not
        // alter pathname for other method calls
        location.pathname = this.basePath;
      }
    }
    return this.parentHistory.createHref(location);
  };

  private prependBasePath(path: Path): Path;
  private prependBasePath(
    location: LocationDescriptorObject<HistoryLocationState>
  ): LocationDescriptorObject<HistoryLocationState>;
  /**
   * Prepends the scoped base path to the Path or Location
   */
  private prependBasePath(
    pathOrLocation: Path | LocationDescriptorObject<HistoryLocationState>
  ): Path | LocationDescriptorObject<HistoryLocationState> {
    if (typeof pathOrLocation === 'string') {
      return this.prependBasePathToString(pathOrLocation);
    } else {
      return {
        ...pathOrLocation,
        pathname:
          pathOrLocation.pathname !== undefined
            ? this.prependBasePathToString(pathOrLocation.pathname)
            : undefined,
      };
    }
  }

  /**
   * Prepends the base path to string.
   */
  private prependBasePathToString(path: string): string {
    return path.length ? `${this.basePath}/${path}`.replace(/\/{2,}/g, '/') : this.basePath;
  }

  /**
   * Removes the base path from a location.
   */
  private stripBasePath(location: Location<HistoryLocationState>): Location<HistoryLocationState> {
    return {
      ...location,
      pathname: location.pathname.replace(new RegExp(`^${this.basePath}`), ''),
    };
  }

  /** Called on each public method to ensure that we have not fallen out of scope yet. */
  private verifyActive() {
    if (!this.isActive) {
      throw new Error(
        `ScopedHistory instance has fell out of navigation scope for basePath: ${this.basePath}`
      );
    }
  }

  /**
   * Sets up the listener on the parent history instance used to follow navigation updates and track our internal
   * state. Also forwards events to child listeners with the base path stripped from the location.
   */
  private setupHistoryListener() {
    const unlisten = this.parentHistory.listen((location, action) => {
      // If the user navigates outside the scope of this basePath, tear it down.
      if (!location.pathname.startsWith(this.basePath)) {
        unlisten();
        this.isActive = false;
        return;
      }

      /**
       * Track location keys using the same algorithm the browser uses internally.
       * - On PUSH, remove all items that came after the current location and append the new location.
       * - On POP, set the current location, but do not change the entries.
       * - On REPLACE, override the location for the current index with the new location.
       */
      if (action === 'PUSH') {
        this.locationKeys = [
          ...this.locationKeys.slice(0, this.currentLocationKeyIndex + 1),
          location.key,
        ];
        this.currentLocationKeyIndex = this.locationKeys.indexOf(location.key); // should always be the last index
      } else if (action === 'POP') {
        this.currentLocationKeyIndex = this.locationKeys.indexOf(location.key);
      } else if (action === 'REPLACE') {
        this.locationKeys[this.currentLocationKeyIndex] = location.key;
      } else {
        throw new Error(`Unrecognized history action: ${action}`);
      }

      [...this.listeners].forEach((listener) => {
        listener(this.stripBasePath(location), action);
      });
    });
  }
}
