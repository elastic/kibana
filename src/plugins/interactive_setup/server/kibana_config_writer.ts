/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { X509Certificate } from 'crypto';
import { constants } from 'fs';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

import type { Logger } from '@kbn/core/server';
import { getFlattenedObject } from '@kbn/std';

import { getDetailedErrorMessage } from './errors';

export type WriteConfigParameters = {
  host: string;
  caCert?: string;
} & (
  | {
      username: string;
      password: string;
    }
  | {
      serviceAccountToken: { name: string; value: string };
    }
  | {}
);

interface FleetOutputConfig {
  id: string;
  name: string;
  is_default: boolean;
  is_default_monitoring: boolean;
  type: 'elasticsearch';
  hosts: string[];
  ca_trusted_fingerprint: string;
}

export class KibanaConfigWriter {
  constructor(
    private readonly configPath: string,
    private readonly dataDirectoryPath: string,
    private readonly logger: Logger
  ) {}

  /**
   * Checks if we can write to the Kibana configuration file and data directory.
   */
  public async isConfigWritable() {
    try {
      // We perform two separate checks here:
      // 1. If we can write to data directory to add a new CA certificate file.
      // 2. If we can write to the Kibana configuration file if it exists.
      await Promise.all([
        fs.access(this.dataDirectoryPath, constants.W_OK),
        fs.access(this.configPath, constants.W_OK),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Writes Elasticsearch configuration to the disk.
   * @param params
   */
  public async writeConfig(params: WriteConfigParameters) {
    const caPath = path.join(this.dataDirectoryPath, `ca_${Date.now()}.crt`);
    const config: Record<string, string | string[] | FleetOutputConfig[]> = {
      'elasticsearch.hosts': [params.host],
    };
    if ('serviceAccountToken' in params && params.serviceAccountToken) {
      config['elasticsearch.serviceAccountToken'] = params.serviceAccountToken.value;
    } else if ('username' in params && params.username) {
      config['elasticsearch.username'] = params.username;
      config['elasticsearch.password'] = params.password;
    }
    if (params.caCert) {
      config['elasticsearch.ssl.certificateAuthorities'] = [caPath];
    }

    // If a certificate is passed configure Fleet default output
    if (params.caCert) {
      try {
        config['xpack.fleet.outputs'] = KibanaConfigWriter.getFleetDefaultOutputConfig(
          params.caCert,
          params.host
        );
      } catch (err) {
        this.logger.error(
          `Failed to generate Fleet default output: ${getDetailedErrorMessage(err)}.`
        );
        throw err;
      }
    }

    // Load and parse existing configuration file to check if it already has values for the config
    // entries we want to write.
    const existingConfig = await this.loadAndParseKibanaConfig();
    const conflictingKeys = Object.keys(config).filter(
      (configKey) => configKey in existingConfig.parsed
    );

    // If existing config has conflicting entries, back it up first.
    let configToWrite;
    if (conflictingKeys.length > 0) {
      this.logger.warn(
        `Kibana configuration file has the following conflicting keys that will be overridden: [${conflictingKeys.join(
          ', '
        )}].`
      );

      const existingCommentedConfig = KibanaConfigWriter.commentOutKibanaConfig(existingConfig.raw);
      configToWrite = `${existingCommentedConfig}\n\n# This section was automatically generated during setup.\n${yaml.safeDump(
        { ...existingConfig.parsed, ...config },
        { flowLevel: 1 }
      )}\n`;
    } else {
      configToWrite = `${
        existingConfig.raw
      }\n\n# This section was automatically generated during setup.\n${yaml.safeDump(config, {
        flowLevel: 1,
      })}\n`;
    }

    if (params.caCert) {
      this.logger.debug(`Writing CA certificate to ${caPath}.`);
      try {
        await fs.writeFile(caPath, params.caCert);
        this.logger.debug(`Successfully wrote CA certificate to ${caPath}.`);
      } catch (err) {
        this.logger.error(
          `Failed to write CA certificate to ${caPath}: ${getDetailedErrorMessage(err)}.`
        );
        throw err;
      }
    }

    this.logger.debug(`Writing Elasticsearch configuration to ${this.configPath}.`);
    try {
      await fs.writeFile(this.configPath, configToWrite);
      this.logger.debug(`Successfully wrote Elasticsearch configuration to ${this.configPath}.`);
    } catch (err) {
      this.logger.error(
        `Failed to write  Elasticsearch configuration to ${
          this.configPath
        }: ${getDetailedErrorMessage(err)}.`
      );

      throw err;
    }
  }

  /**
   * Loads and parses existing Kibana configuration file.
   */
  private async loadAndParseKibanaConfig() {
    let rawConfig: string;
    try {
      rawConfig = await fs.readFile(this.configPath, 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to read configuration file: ${getDetailedErrorMessage(err)}.`);
      throw err;
    }

    let parsedConfig: Record<string, unknown>;
    try {
      parsedConfig = getFlattenedObject(yaml.safeLoad(rawConfig) ?? {});
    } catch (err) {
      this.logger.error(`Failed to parse configuration file: ${getDetailedErrorMessage(err)}.`);
      throw err;
    }

    return { raw: rawConfig, parsed: parsedConfig };
  }

  /**
   * Build config for Fleet outputs
   * @param caCert
   * @param host
   */
  private static getFleetDefaultOutputConfig(caCert: string, host: string): FleetOutputConfig[] {
    const cert = new X509Certificate(caCert);
    // fingerprint256 is a ":" separated uppercase hexadecimal string
    const certFingerprint = cert.fingerprint256.split(':').join('').toLowerCase();

    return [
      {
        id: 'fleet-default-output',
        name: 'default',
        is_default: true,
        is_default_monitoring: true,
        type: 'elasticsearch',
        hosts: [host],
        ca_trusted_fingerprint: certFingerprint,
      },
    ];
  }

  /**
   * Comments out all non-commented entries in the Kibana configuration file.
   * @param rawConfig Content of the Kibana configuration file.
   */
  private static commentOutKibanaConfig(rawConfig: string) {
    const backupTimestamp = new Date().toISOString();
    const commentedRawConfigLines = [
      `### >>>>>>> BACKUP START: Kibana interactive setup (${backupTimestamp})\n`,
    ];
    for (const rawConfigLine of rawConfig.split('\n')) {
      const trimmedLine = rawConfigLine.trim();
      commentedRawConfigLines.push(
        trimmedLine.length === 0 || trimmedLine.startsWith('#')
          ? rawConfigLine
          : `#${rawConfigLine}`
      );
    }

    return [
      ...commentedRawConfigLines,
      `### >>>>>>> BACKUP END: Kibana interactive setup (${backupTimestamp})`,
    ].join('\n');
  }
}
