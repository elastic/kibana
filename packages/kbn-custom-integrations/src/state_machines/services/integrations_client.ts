/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { EPM_API_ROUTES } from '@kbn/fleet-plugin/common';
import * as rt from 'io-ts';
import { i18n } from '@kbn/i18n';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import {
  AuthorizationError,
  customIntegrationOptionsRT,
  DecodeError,
  integrationNameRT,
  IntegrationNotInstalledError,
  NamingCollisionError,
  UnknownError,
  IntegrationName,
  Dataset,
} from '../../types';

const GENERIC_CREATE_ERROR_MESSAGE = i18n.translate(
  'customIntegrationsPackage.genericCreateError',
  {
    defaultMessage: 'Unable to create an integration',
  }
);

const GENERIC_DELETE_ERROR_MESSAGE = i18n.translate(
  'customIntegrationsPackage.genericDeleteError',
  {
    defaultMessage: 'Unable to delete integration',
  }
);

/**
 * Constants
 */
const CUSTOM_INTEGRATIONS_URL = EPM_API_ROUTES.CUSTOM_INTEGRATIONS_PATTERN;
const DELETE_PACKAGE_URL = EPM_API_ROUTES.DELETE_PATTERN;

export interface IIntegrationsClient {
  createCustomIntegration(
    params?: CreateCustomIntegrationRequestQuery
  ): Promise<CreateCustomIntegrationValue>;
  deleteCustomIntegration(
    params?: DeleteCustomIntegrationRequestQuery
  ): Promise<DeleteCustomIntegrationResponse>;
}

export class IntegrationsClient implements IIntegrationsClient {
  constructor(private readonly http: HttpSetup) {}

  public async createCustomIntegration(
    params: CreateCustomIntegrationRequestQuery
  ): Promise<CreateCustomIntegrationValue> {
    try {
      const response = await this.http.post(CUSTOM_INTEGRATIONS_URL, {
        version: '2023-10-31',
        body: JSON.stringify(params),
      });

      const data = decodeOrThrow(
        createCustomIntegrationResponseRT,
        (message: string) =>
          new DecodeError(`Failed to decode create custom integration response: ${message}"`)
      )(response);

      return {
        integrationName: params.integrationName,
        datasets: params.datasets,
        installedAssets: data.items,
      };
    } catch (error) {
      if (error?.body?.statusCode === 409) {
        throw new NamingCollisionError(error.body?.message ?? GENERIC_CREATE_ERROR_MESSAGE);
      } else if (error?.body?.statusCode === 403) {
        throw new AuthorizationError(error?.body?.message ?? GENERIC_CREATE_ERROR_MESSAGE);
      } else if (error instanceof DecodeError) {
        throw error;
      } else {
        throw new UnknownError(error?.body?.message ?? GENERIC_CREATE_ERROR_MESSAGE);
      }
    }
  }

  public async deleteCustomIntegration(
    params: DeleteCustomIntegrationRequestQuery
  ): Promise<DeleteCustomIntegrationResponse> {
    const { integrationName, version } = params;
    try {
      await this.http.delete(
        DELETE_PACKAGE_URL.replace('{pkgName}', integrationName).replace('{pkgVersion}', version),
        { version: '2023-10-31' }
      );
      return {
        integrationName: params.integrationName,
      };
    } catch (error) {
      if (error?.body?.message && error.body.message.includes('is not installed')) {
        throw new IntegrationNotInstalledError(error.body.message);
      } else {
        throw new UnknownError(error?.body?.message ?? GENERIC_DELETE_ERROR_MESSAGE);
      }
    }
  }
}

const assetListRT = rt.array(
  rt.type({
    id: rt.string,
    type: rt.string,
  })
);

type AssetList = rt.TypeOf<typeof assetListRT>;

export const createCustomIntegrationRequestQueryRT = customIntegrationOptionsRT;
export type CreateCustomIntegrationRequestQuery = rt.TypeOf<
  typeof createCustomIntegrationRequestQueryRT
>;

export const createCustomIntegrationResponseRT = rt.exact(
  rt.type({
    items: assetListRT,
  })
);

export interface CreateCustomIntegrationValue {
  integrationName: IntegrationName;
  datasets: Dataset[];
  installedAssets: AssetList;
}

export const deleteCustomIntegrationRequestQueryRT = rt.type({
  integrationName: rt.string,
  version: rt.string,
});

export type DeleteCustomIntegrationRequestQuery = rt.TypeOf<
  typeof deleteCustomIntegrationRequestQueryRT
>;

export const deleteCustomIntegrationResponseRT = rt.exact(
  rt.type({
    integrationName: integrationNameRT,
  })
);

export type DeleteCustomIntegrationResponse = rt.TypeOf<typeof deleteCustomIntegrationResponseRT>;
