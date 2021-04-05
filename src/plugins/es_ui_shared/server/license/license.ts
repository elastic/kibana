/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  Logger,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'src/core/server';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import type {
  LicenseType,
  LicenseCheckState,
} from '../../../../../x-pack/plugins/licensing/common/types';
import type { LicensingPluginStart } from '../../../../../x-pack/plugins/licensing/server/types';
/* eslint-enable @kbn/eslint/no-restricted-paths */

type LicenseLogger = Pick<Logger, 'warn'>;

interface SetupSettings {
  pluginName: string;
  logger: LicenseLogger;
}

interface StartSettings {
  pluginId: string;
  minimumLicenseType: LicenseType;
  licensing: LicensingPluginStart;
}

export class License {
  private pluginName?: string;
  private logger?: LicenseLogger;
  private licenseCheckState: LicenseCheckState = 'unavailable';
  private licenseType?: LicenseType;

  private _isEsSecurityEnabled: boolean = false;

  setup({ pluginName, logger }: SetupSettings) {
    this.pluginName = pluginName;
    this.logger = logger;
  }

  start({ pluginId, minimumLicenseType, licensing }: StartSettings) {
    licensing.license$.subscribe((license) => {
      this.licenseType = license.type;
      this.licenseCheckState = license.check(pluginId, minimumLicenseType!).state;

      // Retrieving security checks the results of GET /_xpack as well as license state,
      // so we're also checking whether security is disabled in elasticsearch.yml.
      this._isEsSecurityEnabled = license.getFeature('security').isEnabled;
    });
  }

  getLicenseErrorMessage(licenseCheckState: LicenseCheckState): string {
    switch (licenseCheckState) {
      case 'invalid':
        return i18n.translate('esUi.license.errorUnsupportedMessage', {
          defaultMessage:
            'Your {licenseType} license does not support {pluginName}. Please upgrade your license.',
          values: { licenseType: this.licenseType!, pluginName: this.pluginName },
        });

      case 'expired':
        return i18n.translate('esUi.license.errorExpiredMessage', {
          defaultMessage:
            'You cannot use {pluginName} because your {licenseType} license has expired.',
          values: { licenseType: this.licenseType!, pluginName: this.pluginName },
        });

      case 'unavailable':
        return i18n.translate('esUi.license.errorUnavailableMessage', {
          defaultMessage:
            'You cannot use {pluginName} because license information is not available at this time.',
          values: { pluginName: this.pluginName },
        });
    }

    return i18n.translate('esUi.license.genericErrorMessage', {
      defaultMessage: 'You cannot use {pluginName} because the license check failed.',
      values: { pluginName: this.pluginName },
    });
  }

  guardApiRoute<Context extends RequestHandlerContext, Params, Query, Body>(
    handler: RequestHandler<Params, Query, Body, Context>
  ) {
    return (
      ctx: Context,
      request: KibanaRequest<Params, Query, Body>,
      response: KibanaResponseFactory
    ) => {
      // We'll only surface license errors if users attempt disallowed access to the API.
      if (this.licenseCheckState !== 'valid') {
        const licenseErrorMessage = this.getLicenseErrorMessage(this.licenseCheckState);
        this.logger?.warn(licenseErrorMessage);

        return response.customError({
          body: {
            message: licenseErrorMessage,
          },
          statusCode: 403,
        });
      }

      return handler(ctx, request, response);
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
  get isEsSecurityEnabled() {
    return this._isEsSecurityEnabled;
  }
}
