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

import { Observable, BehaviorSubject } from 'rxjs';
import { CapabilitiesStart, CapabilitiesService, Capabilities } from './capabilities';
import { InjectedMetadataStart } from '../injected_metadata';

interface BaseApp {
  id: string;

  /**
   * An ordinal used to sort nav links relative to one another for display.
   */
  order: number;

  /**
   * The title of the application.
   */
  title: string;

  /**
   * An observable for a tooltip shown when hovering over app link.
   */
  tooltip$?: Observable<string>;

  /**
   * A EUI iconType that will be used for the app's icon. This icon
   * takes precendence over the `icon` property.
   */
  euiIconType?: string;

  /**
   * A URL to an image file used as an icon. Used as a fallback
   * if `euiIconType` is not provided.
   */
  icon?: string;

  /**
   * Custom capabilities defined by the app.
   */
  capabilities?: Partial<Capabilities>;
}

/** @public */
export interface App extends BaseApp {
  /**
   * The root route to mount this application at.
   */
  rootRoute: string;

  /**
   * A mount function called when the user navigates to this app's `rootRoute`.
   * @param targetDomElement An HTMLElement to mount the application onto.
   * @returns An unmounting function that will be called to unmount the application.
   */
  mount(targetDomElement: HTMLElement): () => void;
}

/** @internal */
export interface LegacyApp extends BaseApp {
  appUrl: string;
  subUrlBase?: string;
  linkToLastSubUrl?: boolean;
}

/** @internal */
export type MixedApp = Partial<App> & Partial<LegacyApp> & BaseApp;

/** @public */
export interface ApplicationSetup {
  /**
   * Register an mountable application to the system. Apps will be mounted based on their `rootRoute`.
   * @param app
   */
  registerApp(app: App): void;

  /**
   * Register metadata about legacy applications. Legacy apps will not be mounted when navigated to.
   * @param app
   * @internal
   */
  registerLegacyApp(app: LegacyApp): void;
}

export interface ApplicationStart {
  mount: (mountHandler: Function) => void;
  availableApps: CapabilitiesStart['availableApps'];
  capabilities: CapabilitiesStart['capabilities'];
}

interface StartDeps {
  injectedMetadata: InjectedMetadataStart;
}

/**
 * Service that is responsible for registering new applications.
 * @internal
 */
export class ApplicationService {
  private readonly apps$ = new BehaviorSubject<App[]>([]);
  private readonly legacyApps$ = new BehaviorSubject<LegacyApp[]>([]);
  private readonly capabilities = new CapabilitiesService();

  public setup(): ApplicationSetup {
    return {
      registerApp: (app: App) => {
        this.apps$.next([...this.apps$.value, app]);
      },
      registerLegacyApp: (app: LegacyApp) => {
        this.legacyApps$.next([...this.legacyApps$.value, app]);
      },
    };
  }

  public async start({ injectedMetadata }: StartDeps): Promise<ApplicationStart> {
    this.apps$.complete();
    this.legacyApps$.complete();

    const apps = [...this.apps$.value, ...this.legacyApps$.value];
    const { capabilities, availableApps } = await this.capabilities.start({
      apps,
      injectedMetadata,
    });

    return {
      mount() {},
      capabilities,
      availableApps,
    };
  }

  public stop() {}
}
