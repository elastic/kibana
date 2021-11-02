/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { Type } from '@kbn/config-schema';
import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, first, map, shareReplay, take, tap } from 'rxjs/operators';
import { Logger, LoggerFactory } from '@kbn/logging';

import { Config, ConfigPath, Env } from '.';
import { hasConfigPathIntersection } from './config';
import { RawConfigurationProvider } from './raw/raw_config_service';
import {
  applyDeprecations,
  ConfigDeprecationWithContext,
  ConfigDeprecationContext,
  ConfigDeprecationProvider,
  configDeprecationFactory,
  DeprecatedConfigDetails,
  ChangedDeprecatedPaths,
} from './deprecation';
import { ObjectToConfigAdapter } from './object_to_config_adapter';

/** @internal */
export type IConfigService = PublicMethodsOf<ConfigService>;

/** @internal */
export interface ConfigValidateParameters {
  /**
   * Indicates whether config deprecations should be logged during validation.
   */
  logDeprecations: boolean;
}

/** @internal */
export class ConfigService {
  private readonly log: Logger;
  private readonly deprecationLog: Logger;

  private validated = false;
  private readonly config$: Observable<Config>;
  private lastConfig?: Config;
  private readonly deprecatedConfigPaths = new BehaviorSubject<ChangedDeprecatedPaths>({
    set: [],
    unset: [],
  });

  /**
   * Whenever a config if read at a path, we mark that path as 'handled'. We can
   * then list all unhandled config paths when the startup process is completed.
   */
  private readonly handledPaths: Set<ConfigPath> = new Set();
  private readonly schemas = new Map<string, Type<unknown>>();
  private readonly deprecations = new BehaviorSubject<ConfigDeprecationWithContext[]>([]);
  private readonly handledDeprecatedConfigs = new Map<string, DeprecatedConfigDetails[]>();

  constructor(
    private readonly rawConfigProvider: RawConfigurationProvider,
    private readonly env: Env,
    logger: LoggerFactory
  ) {
    this.log = logger.get('config');
    this.deprecationLog = logger.get('config', 'deprecation');

    this.config$ = combineLatest([this.rawConfigProvider.getConfig$(), this.deprecations]).pipe(
      map(([rawConfig, deprecations]) => {
        const migrated = applyDeprecations(rawConfig, deprecations);
        this.deprecatedConfigPaths.next(migrated.changedPaths);
        return new ObjectToConfigAdapter(migrated.config);
      }),
      tap((config) => {
        this.lastConfig = config;
      }),
      shareReplay(1)
    );
  }

  /**
   * Set config schema for a path and performs its validation
   */
  public setSchema(path: ConfigPath, schema: Type<unknown>) {
    const namespace = pathToString(path);
    if (this.schemas.has(namespace)) {
      throw new Error(`Validation schema for [${path}] was already registered.`);
    }

    this.schemas.set(namespace, schema);
    this.markAsHandled(path);
  }

  /**
   * Register a {@link ConfigDeprecationProvider} to be used when validating and migrating the configuration
   */
  public addDeprecationProvider(path: ConfigPath, provider: ConfigDeprecationProvider) {
    const flatPath = pathToString(path);
    this.deprecations.next([
      ...this.deprecations.value,
      ...provider(configDeprecationFactory).map((deprecation) => ({
        deprecation,
        path: flatPath,
        context: createDeprecationContext(this.env),
      })),
    ]);
  }

  /**
   * returns all handled deprecated configs
   */
  public getHandledDeprecatedConfigs() {
    return [...this.handledDeprecatedConfigs.entries()];
  }

  /**
   * Validate the whole configuration and log the deprecation warnings.
   *
   * This must be done after every schemas and deprecation providers have been registered.
   */
  public async validate(params: ConfigValidateParameters = { logDeprecations: true }) {
    const namespaces = [...this.schemas.keys()];
    for (let i = 0; i < namespaces.length; i++) {
      await this.getValidatedConfigAtPath$(namespaces[i]).pipe(first()).toPromise();
    }

    if (params.logDeprecations) {
      await this.logDeprecation();
    }

    this.validated = true;
  }

  /**
   * Returns the full config object observable. This is not intended for
   * "normal use", but for internal features that _need_ access to the full object.
   */
  public getConfig$() {
    return this.config$;
  }

  /**
   * Reads the subset of the config at the specified `path` and validates it
   * against its registered schema.
   *
   * @param path - The path to the desired subset of the config.
   */
  public atPath<TSchema>(path: ConfigPath) {
    return this.getValidatedConfigAtPath$(path) as Observable<TSchema>;
  }

  /**
   * Similar to {@link atPath}, but return the last emitted value synchronously instead of an
   * observable.
   *
   * @param path - The path to the desired subset of the config.
   */
  public atPathSync<TSchema>(path: ConfigPath) {
    if (!this.validated) {
      throw new Error('`atPathSync` called before config was validated');
    }
    const configAtPath = this.lastConfig!.get(path);
    return this.validateAtPath(path, configAtPath) as TSchema;
  }

  public async isEnabledAtPath(path: ConfigPath) {
    const namespace = pathToString(path);
    const hasSchema = this.schemas.has(namespace);

    const config = await this.config$.pipe(first()).toPromise();
    if (!hasSchema && config.has(path)) {
      // Throw if there is no schema, but a config exists at the path.
      throw new Error(`No validation schema has been defined for [${namespace}]`);
    }

    const validatedConfig = hasSchema
      ? await this.atPath<{ enabled?: boolean }>(path).pipe(first()).toPromise()
      : undefined;

    const isDisabled = validatedConfig?.enabled === false;
    if (isDisabled) {
      // If the plugin is explicitly disabled, we mark the entire plugin
      // path as handled, as it's expected that it won't be used.
      this.markAsHandled(path);
      return false;
    }

    // If the schema exists and the config is explicitly set to true,
    // _or_ if the `enabled` config is undefined, then we treat the
    // plugin as enabled.
    return true;
  }

  public async getUnusedPaths() {
    const config = await this.config$.pipe(first()).toPromise();
    const handledPaths = [...this.handledPaths.values()].map(pathToString);
    return config.getFlattenedPaths().filter((path) => !isPathHandled(path, handledPaths));
  }

  public async getUsedPaths() {
    const config = await this.config$.pipe(first()).toPromise();
    const handledPaths = [...this.handledPaths.values()].map(pathToString);
    return config.getFlattenedPaths().filter((path) => isPathHandled(path, handledPaths));
  }

  public getDeprecatedConfigPath$() {
    return this.deprecatedConfigPaths.asObservable();
  }

  private async logDeprecation() {
    const rawConfig = await this.rawConfigProvider.getConfig$().pipe(take(1)).toPromise();
    const deprecations = await this.deprecations.pipe(take(1)).toPromise();
    const deprecationMessages: string[] = [];
    const createAddDeprecation = (domainId: string) => (context: DeprecatedConfigDetails) => {
      if (!context.silent) {
        deprecationMessages.push(context.message);
      }
      this.markDeprecatedConfigAsHandled(domainId, context);
    };

    applyDeprecations(rawConfig, deprecations, createAddDeprecation);
    deprecationMessages.forEach((msg) => {
      this.deprecationLog.warn(msg);
    });
  }

  private validateAtPath(path: ConfigPath, config: Record<string, unknown>) {
    const namespace = pathToString(path);
    const schema = this.schemas.get(namespace);
    if (!schema) {
      throw new Error(`No validation schema has been defined for [${namespace}]`);
    }
    return schema.validate(
      config,
      {
        dev: this.env.mode.dev,
        prod: this.env.mode.prod,
        ...this.env.packageInfo,
      },
      `config validation of [${namespace}]`
    );
  }

  private getValidatedConfigAtPath$(path: ConfigPath) {
    return this.config$.pipe(
      map((config) => config.get(path)),
      distinctUntilChanged(isEqual),
      map((config) => this.validateAtPath(path, config))
    );
  }

  private markAsHandled(path: ConfigPath) {
    this.log.debug(`Marking config path as handled: ${path}`);
    this.handledPaths.add(path);
  }

  private markDeprecatedConfigAsHandled(domainId: string, config: DeprecatedConfigDetails) {
    const handledDeprecatedConfig = this.handledDeprecatedConfigs.get(domainId) || [];
    handledDeprecatedConfig.push(config);
    this.handledDeprecatedConfigs.set(domainId, handledDeprecatedConfig);
  }
}

const pathToString = (path: ConfigPath) => (Array.isArray(path) ? path.join('.') : path);

/**
 * A path is considered 'handled' if it is a subset of any of the already
 * handled paths.
 */
const isPathHandled = (path: string, handledPaths: string[]) =>
  handledPaths.some((handledPath) => hasConfigPathIntersection(path, handledPath));

const createDeprecationContext = (env: Env): ConfigDeprecationContext => {
  return {
    branch: env.packageInfo.branch,
    version: env.packageInfo.version,
  };
};
