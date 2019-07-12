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

import { BehaviorSubject, Observable, Subscription, from, interval } from 'rxjs';
import { first, map, switchMap, tap } from 'rxjs/operators';
import moment from 'moment';
import { CoreService } from '../../types';
import { Logger } from '../logging';
import { CoreContext } from '../core_context';
import { LicensingServiceSubject, LicensingConfigType, LicensingSetupDependencies } from './types';
import { SERVICE_NAME, LICENSE_TYPE } from './constants';
import { LicensingConfig } from './licensing_config';
import { LicensingServiceSetup } from './licensing_service_setup';

/** @internal */
export class LicensingService
  implements CoreService<LicensingServiceSubject, LicensingServiceSubject> {
  private readonly config$: Observable<LicensingConfig>;
  private readonly logger: Logger;
  private poller$!: Observable<number>;
  private pollerSubscription!: Subscription;
  private service$!: LicensingServiceSubject;
  private license: any;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get(SERVICE_NAME);
    this.config$ = coreContext.configService
      .atPath<LicensingConfigType>(SERVICE_NAME)
      .pipe(map(rawConfig => new LicensingConfig(rawConfig, coreContext.env)));
  }

  private hasLicenseInfoChanged(newLicense: any) {
    return (
      newLicense.mode !== this.license.mode ||
      newLicense.status !== this.license.status ||
      newLicense.expiry_date_in_millis !== this.license.expiry_date_in_millis
    );
  }

  private async fetchInfo(
    { http }: LicensingSetupDependencies,
    clusterSource: string,
    pollingFrequency: number
  ) {
    this.logger.debug(
      `Calling [${clusterSource}] Elasticsearch _xpack API. Polling frequency: ${pollingFrequency}`
    );

    const cluster = http.server.plugins.elasticsearch.getCluster(clusterSource);

    try {
      const response = await cluster.callWithInternalUser('transport.request', {
        method: 'GET',
        path: '/_xpack',
      });
      const newLicense = (response && response.license) || {};
      const features = (response && response.features) || {};
      const licenseInfoChanged = this.hasLicenseInfoChanged(newLicense);

      if (licenseInfoChanged) {
        const licenseInfo = [
          `mode: ${newLicense.mode}`,
          `status: ${newLicense.status}`,
          'expiry_date_in_millis' in newLicense &&
            `expiry date: ${moment(newLicense.expiry_date_in_millis, 'x').format()}`,
        ]
          .filter(Boolean)
          .join(' | ');

        this.logger.info(
          `Imported ${this.license ? 'changed ' : ''}license information` +
            ` from Elasticsearch for the [${clusterSource}] cluster: ${licenseInfo}`
        );

        return { license: false, error: null, features };
      }

      return { license: newLicense, error: null, features };
    } catch (err) {
      this.logger.warn(
        `License information could not be obtained from Elasticsearch` +
          ` for the [${clusterSource}] cluster. ${err}`
      );

      return { license: null, error: err, features: {} };
    }
  }

  private create(
    { clusterSource, pollingFrequency }: LicensingConfig,
    deps: LicensingSetupDependencies
  ) {
    if (this.service$) {
      return this.service$;
    }

    const service$ = new BehaviorSubject<LicensingServiceSetup | null>(null);

    this.poller$ = interval(pollingFrequency);
    this.poller$.pipe(
      switchMap(_ =>
        from(this.fetchInfo(deps, clusterSource, pollingFrequency)).pipe(
          tap(({ license, error, features }) => {
            // If license is false, the license did not change and we don't need to push
            // a new one
            if (license !== false) {
              service$.next(new LicensingServiceSetup(license, features, error, clusterSource));
            }
          })
        )
      )
    );

    this.pollerSubscription = this.poller$.subscribe();

    deps.http.server.events.on('stop', () => {
      this.stop();
    });

    return service$;
  }

  public async setup(deps: LicensingSetupDependencies) {
    const config = await this.config$.pipe(first()).toPromise();
    const service$ = this.create(config, deps);

    this.service$ = service$;

    return this.service$;
  }

  public async start(deps: LicensingSetupDependencies) {
    const config = await this.config$.pipe(first()).toPromise();
    const service$ = this.create(config, deps);

    return service$;
  }

  public async stop() {
    if (this.pollerSubscription) {
      this.pollerSubscription.unsubscribe();
    }
  }
}
