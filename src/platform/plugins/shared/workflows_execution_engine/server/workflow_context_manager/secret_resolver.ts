/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ISecretResolver } from './types';

const SECRET_PATTERN = /\$\{workplace_connector:([^:]+):([^}]+)\}/g;

interface WorkplaceConnectorDecrypted {
  attributes: {
    secrets?: Record<string, string>;
  };
}

interface BoomLike {
  output?: { statusCode?: number };
}

/**
 * Service for resolving secret references in workflow steps
 * Resolves patterns like ${workplace_connector:connector_id:secret_key}
 * by fetching the workplace_connector saved object and extracting the secret
 */
export class SecretResolver implements ISecretResolver {
  constructor(
    private readonly logger: Logger,
    private readonly eso?: EncryptedSavedObjectsPluginStart
  ) {}

  async resolveSecrets(
    text: string,
    savedObjectsClient: SavedObjectsClientContract,
    namespace?: string
  ): Promise<string> {
    const matches = Array.from(text.matchAll(SECRET_PATTERN));
    if (matches.length === 0) {
      return text;
    }

    let resolvedText = text;
    const ns = namespace ?? 'default';
    for (const match of matches) {
      const fullMatch = match[0];
      const connectorIdentifier = match[1];
      const secretKey = match[2];

      try {
        this.logger.info(`[SecretResolver] Resolving secret. ns=${ns}`);
        const secretValue = await this.getSecret(
          connectorIdentifier,
          secretKey,
          savedObjectsClient,
          namespace
        );
        resolvedText = resolvedText.replace(fullMatch, secretValue);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `[SecretResolver] Failed to resolve ${fullMatch}. ns=${ns} reason=${message}`
        );
        throw new Error(`Failed to resolve secret reference: ${fullMatch}`);
      }
    }

    return resolvedText;
  }

  async resolveSecretsInObject(
    obj: Record<string, unknown>,
    savedObjectsClient: SavedObjectsClientContract,
    namespace?: string
  ): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        resolved[key] = await this.resolveSecrets(value, savedObjectsClient, namespace);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        resolved[key] = await this.resolveSecretsInObject(
          value as Record<string, unknown>,
          savedObjectsClient,
          namespace
        );
      } else if (Array.isArray(value)) {
        resolved[key] = await Promise.all(
          value.map((item) => {
            if (typeof item === 'string') {
              return this.resolveSecrets(item, savedObjectsClient, namespace);
            }
            if (item && typeof item === 'object') {
              return this.resolveSecretsInObject(
                item as Record<string, unknown>,
                savedObjectsClient,
                namespace
              );
            }
            return item;
          })
        );
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private isNotFoundError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode: number | undefined = (error as BoomLike | undefined)?.output?.statusCode;
    return statusCode === 404 || /not found/i.test(message);
  }

  private extractSecrets(obj: unknown): Record<string, string> | undefined {
    const decrypted = obj as WorkplaceConnectorDecrypted;
    return decrypted?.attributes?.secrets;
  }

  private async getSecret(
    connectorIdentifier: string,
    secretKey: string,
    savedObjectsClient: SavedObjectsClientContract,
    namespace?: string
  ): Promise<string> {
    const ns = namespace ?? 'default';

    if (this.eso) {
      try {
        this.logger.info(`[SecretResolver] ESO decrypt by id. ns=${ns}`);
        const decrypted = (await this.eso
          .getClient({ includedHiddenTypes: ['workplace_connector'] })
          .getDecryptedAsInternalUser('workplace_connector', connectorIdentifier, {
            namespace,
          })) as unknown as WorkplaceConnectorDecrypted;
        const secrets = this.extractSecrets(decrypted);
        if (secrets && secrets[secretKey]) {
          return secrets[secretKey];
        }
        throw new Error(
          `Secret key "${secretKey}" not found in workplace connector "${connectorIdentifier}"`
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const notFound = this.isNotFoundError(e);
        this.logger.info(
          `[SecretResolver] ESO decrypt by id failed. notFound=${String(
            notFound
          )} reason=${message}`
        );
        if (!notFound) {
          throw e;
        }
        // Try find by type in the same namespace
        const found = await savedObjectsClient.find<{ name: string; type: string }>({
          type: 'workplace_connector',
          filter: `workplace_connector.attributes.type: "${connectorIdentifier}"`,
          perPage: 1,
        });
        if (found.total > 0) {
          const connectorId = found.saved_objects[0].id;
          try {
            this.logger.info(`[SecretResolver] ESO decrypt by type-resolved id. ns=${ns}`);
            const decryptedByType = (await this.eso
              .getClient({ includedHiddenTypes: ['workplace_connector'] })
              .getDecryptedAsInternalUser('workplace_connector', connectorId, {
                namespace,
              })) as unknown as WorkplaceConnectorDecrypted;
            const secrets = this.extractSecrets(decryptedByType);
            if (secrets && secrets[secretKey]) {
              return secrets[secretKey];
            }
            throw new Error(
              `Secret key "${secretKey}" not found in workplace connector "${connectorId}"`
            );
          } catch (e2) {
            const msg = e2 instanceof Error ? e2.message : String(e2);
            this.logger.info(
              `[SecretResolver] ESO decrypt by type-resolved id failed. reason=${msg}`
            );
          }
        }
        // Secondary namespace resolution
        try {
          const so = (await savedObjectsClient.get(
            'workplace_connector',
            connectorIdentifier
          )) as SavedObject<unknown> & { namespaces?: string[] };
          const soNamespace = so.namespaces?.[0];
          if (soNamespace) {
            this.logger.info(
              `[SecretResolver] ESO decrypt retry with SO namespace. ns=${soNamespace}`
            );
            const decryptedWithSoNs = (await this.eso
              .getClient({ includedHiddenTypes: ['workplace_connector'] })
              .getDecryptedAsInternalUser('workplace_connector', connectorIdentifier, {
                namespace: soNamespace,
              })) as unknown as WorkplaceConnectorDecrypted;
            const secrets = this.extractSecrets(decryptedWithSoNs);
            if (secrets && secrets[secretKey]) {
              return secrets[secretKey];
            }
          }
        } catch (e3) {
          const msg = e3 instanceof Error ? e3.message : String(e3);
          this.logger.info(
            `[SecretResolver] ESO decrypt retry with SO namespace failed. reason=${msg}`
          );
        }
        if (namespace) {
          try {
            this.logger.info('[SecretResolver] ESO decrypt final fallback without namespace.');
            const decrypted = (await this.eso
              .getClient({ includedHiddenTypes: ['workplace_connector'] })
              .getDecryptedAsInternalUser(
                'workplace_connector',
                connectorIdentifier
              )) as unknown as WorkplaceConnectorDecrypted;
            const secrets = this.extractSecrets(decrypted);
            if (secrets && secrets[secretKey]) {
              return secrets[secretKey];
            }
          } catch (e4) {
            const msg = e4 instanceof Error ? e4.message : String(e4);
            this.logger.info(`[SecretResolver] ESO decrypt final fallback failed. reason=${msg}`);
          }
        }
        throw new Error(`Workplace connector with id or type "${connectorIdentifier}" not found`);
      }
    }

    // Non-ESO fallback
    try {
      const byId = await savedObjectsClient.get<{
        name: string;
        type: string;
        secrets?: Record<string, string>;
      }>('workplace_connector', connectorIdentifier);
      const secrets = byId.attributes?.secrets as Record<string, string> | undefined;
      if (secrets && secrets[secretKey]) {
        return secrets[secretKey];
      }
    } catch (e5) {
      const msg = e5 instanceof Error ? e5.message : String(e5);
      this.logger.info(`[SecretResolver] Non-ESO get by id failed. reason=${msg}`);
    }
    const findResult = await savedObjectsClient.find<{ name: string; type: string }>({
      type: 'workplace_connector',
      filter: `workplace_connector.attributes.type: "${connectorIdentifier}"`,
      perPage: 1,
    });
    if (findResult.total > 0) {
      const so = findResult.saved_objects[0];
      const secrets = (so.attributes as unknown as { secrets?: Record<string, string> }).secrets;
      if (secrets && secrets[secretKey]) {
        return secrets[secretKey];
      }
      throw new Error(`Secret key "${secretKey}" not found in workplace connector "${so.id}"`);
    }

    throw new Error(`Workplace connector with id or type "${connectorIdentifier}" not found`);
  }
}
