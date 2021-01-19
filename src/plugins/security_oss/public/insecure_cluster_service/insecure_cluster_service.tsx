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

import { CoreSetup, CoreStart, MountPoint, Toast } from 'kibana/public';

import { BehaviorSubject, combineLatest, from } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { ConfigType } from '../config';
import type { AppStateServiceStart } from '../app_state';
import { defaultAlertText, defaultAlertTitle } from './components';

interface SetupDeps {
  core: Pick<CoreSetup, 'http'>;
}

interface StartDeps {
  core: Pick<CoreStart, 'notifications' | 'application'>;
  appState: AppStateServiceStart;
}

export interface InsecureClusterServiceSetup {
  setAlertTitle: (alertTitle: string | MountPoint) => void;
  setAlertText: (alertText: string | MountPoint) => void;
}

export interface InsecureClusterServiceStart {
  hideAlert: (persist: boolean) => void;
}

export class InsecureClusterService {
  private enabled: boolean;

  private alertVisibility$: BehaviorSubject<boolean>;

  private storage: Storage;

  private alertToast?: Toast;

  private alertTitle?: string | MountPoint;

  private alertText?: string | MountPoint;

  private storageKey?: string;

  constructor(config: Pick<ConfigType, 'showInsecureClusterWarning'>, storage: Storage) {
    this.storage = storage;
    this.enabled = config.showInsecureClusterWarning;
    this.alertVisibility$ = new BehaviorSubject(this.enabled);
  }

  public setup({ core }: SetupDeps): InsecureClusterServiceSetup {
    const tenant = core.http.basePath.serverBasePath;
    this.storageKey = `insecureClusterWarningVisibility${tenant}`;
    this.enabled = this.enabled && this.getPersistedVisibilityPreference();
    this.alertVisibility$.next(this.enabled);

    return {
      setAlertTitle: (alertTitle: string | MountPoint) => {
        if (this.alertTitle) {
          throw new Error('alert title has already been set');
        }
        this.alertTitle = alertTitle;
      },
      setAlertText: (alertText: string | MountPoint) => {
        if (this.alertText) {
          throw new Error('alert text has already been set');
        }
        this.alertText = alertText;
      },
    };
  }

  public start({ core, appState }: StartDeps): InsecureClusterServiceStart {
    if (this.enabled) {
      this.initializeAlert(core, appState);
    }

    return {
      hideAlert: (persist: boolean) => this.setAlertVisibility(false, persist),
    };
  }

  private initializeAlert(core: StartDeps['core'], appState: AppStateServiceStart) {
    const appState$ = from(appState.getState());

    // 10 days is reasonably long enough to call "forever" for a page load.
    // Can't go too much longer than this. See https://github.com/elastic/kibana/issues/64264#issuecomment-618400354
    const oneMinute = 60000;
    const tenDays = oneMinute * 60 * 24 * 10;

    combineLatest([appState$, this.alertVisibility$])
      .pipe(
        map(
          ([{ insecureClusterAlert }, isAlertVisible]) =>
            insecureClusterAlert.displayAlert && isAlertVisible
        ),
        distinctUntilChanged()
      )
      .subscribe((showAlert) => {
        if (showAlert && !this.alertToast) {
          this.alertToast = core.notifications.toasts.addWarning(
            {
              title: this.alertTitle ?? defaultAlertTitle,
              text:
                this.alertText ??
                defaultAlertText((persist: boolean) => this.setAlertVisibility(false, persist)),
              iconType: 'alert',
            },
            {
              toastLifeTimeMs: tenDays,
            }
          );
        } else if (!showAlert && this.alertToast) {
          core.notifications.toasts.remove(this.alertToast);
          this.alertToast = undefined;
        }
      });
  }

  private setAlertVisibility(show: boolean, persist: boolean) {
    if (!this.enabled) {
      return;
    }
    this.alertVisibility$.next(show);
    if (persist) {
      this.setPersistedVisibilityPreference(show);
    }
  }

  private getPersistedVisibilityPreference() {
    const entry = this.storage.getItem(this.storageKey!) ?? '{}';
    try {
      const { show = true } = JSON.parse(entry);
      return show;
    } catch (e) {
      return true;
    }
  }

  private setPersistedVisibilityPreference(show: boolean) {
    this.storage.setItem(this.storageKey!, JSON.stringify({ show }));
  }
}
