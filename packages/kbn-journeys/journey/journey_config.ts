/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/utils';
import { FtrConfigProvider } from '@kbn/test';

import { makeFtrConfigProvider } from './journey_ftr_config';
import { BaseStepCtx } from './journey';

export interface RampConcurrentUsersAction {
  action: 'rampConcurrentUsers';
  /**
   * Duration strings must be formatted as string that starts with an integer and
   * ends with either "m" or "s" for minutes and seconds, respectively
   *
   * eg: "1m" or "30s"
   */
  duration: string;
  minUsersCount: number;
  maxUsersCount: number;
}

export interface ConstantConcurrentUsersAction {
  action: 'constantConcurrentUsers';
  /**
   * Duration strings must be formatted as string that starts with an integer and
   * ends with either "m" or "s" for minutes and seconds, respectively
   *
   * eg: "1m" or "30s"
   */
  duration: string;
  userCount: number;
}

export type ScalabilityAction = RampConcurrentUsersAction | ConstantConcurrentUsersAction;

export interface ScalabilitySetup {
  /**
   * Duration strings must be formatted as string that starts with an integer and
   * ends with either "m" or "s" for minutes and seconds, respectively
   *
   * eg: "1m" or "30s"
   */
  maxDuration: string;
  warmup: ScalabilityAction[];
  test: ScalabilityAction[];
}

export interface JourneyConfigOptions<CtxExt> {
  skipped?: boolean;
  scalabilitySetup?: ScalabilitySetup;
  extraApmLabels?: Record<string, string>;
  extraKibanaServerArgs?: string[];
  kbnArchives?: string[];
  esArchives?: string[];
  skipAutoLogin?: boolean;
  extendContext?: (ctx: BaseStepCtx) => CtxExt;
}

const CONFIG_PROVIDER_CACHE = new WeakMap<JourneyConfig<any>, FtrConfigProvider>();

export class JourneyConfig<CtxExt extends object> {
  static convertToFtrConfigProvider(config: JourneyConfig<any>) {
    const cached = CONFIG_PROVIDER_CACHE.get(config);
    if (cached) {
      return cached;
    }

    const provider = makeFtrConfigProvider(config);
    CONFIG_PROVIDER_CACHE.set(config, provider);
    return provider;
  }

  #opts: JourneyConfigOptions<CtxExt>;
  #path: string;
  #name: string;

  constructor(path: string, opts: JourneyConfigOptions<CtxExt> = {}) {
    this.#path = path;
    this.#name = Path.basename(this.#path, Path.extname(this.#path));
    this.#opts = opts;
  }

  getEsArchives() {
    return this.#opts.esArchives ?? [];
  }

  getKbnArchives() {
    return this.#opts.kbnArchives ?? [];
  }

  isXpack() {
    return this.getRepoRelPath().split(Path.sep).at(0) === 'x-pack';
  }

  getExtraKibanaServerArgs() {
    return this.#opts.extraKibanaServerArgs ? [...this.#opts.extraKibanaServerArgs] : [];
  }

  getExtraApmLabels() {
    return this.#opts.extraApmLabels ? { ...this.#opts.extraApmLabels } : {};
  }

  getRepoRelPath() {
    return Path.relative(REPO_ROOT, this.getPath());
  }

  getPath() {
    return this.#path;
  }

  getName() {
    return this.#name;
  }

  shouldAutoLogin() {
    return !this.#opts.skipAutoLogin;
  }

  isSkipped() {
    return !!this.#opts.skipped;
  }

  getScalabilityConfig() {
    return this.#opts.scalabilitySetup;
  }

  getExtendedStepCtx(ctx: BaseStepCtx): BaseStepCtx & CtxExt {
    const ext = this.#opts.extendContext ?? (() => ({} as CtxExt));

    return {
      ...ctx,
      ...ext(ctx),
    };
  }
}
