/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

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

export type ResponseTimeMetric =
  | 'min'
  | '25%'
  | '50%'
  | '75%'
  | '80%'
  | '85%'
  | '90%'
  | '95%'
  | '99%'
  | 'max';

export interface ScalabilitySetup {
  /**
   * Duration strings must be formatted as string that starts with an integer and
   * ends with either "m" or "s" for minutes and seconds, respectively
   *
   * eg: "1m" or "30s"
   */
  maxDuration: string;
  responseTimeMetric?: ResponseTimeMetric;
  responseTimeThreshold?: {
    threshold1: number;
    threshold2: number;
    threshold3: number;
  };
  warmup: ScalabilityAction[];
  test: ScalabilityAction[];
}

export interface JourneyConfigOptions<CtxExt> {
  /**
   * Set to `true` to skip this journey. should probably be preceded
   * by a link to a Github issue where the reasoning for why this was
   * skipped and not just deleted is outlined.
   */
  skipped?: boolean;
  /**
   * Scalability configuration used to customize automatically generated
   * scalability tests. For now chat with Dima/Operations if you want to
   * use this option.
   */
  scalabilitySetup?: ScalabilitySetup;
  /**
   * These labels will be attached to all APM data created when running
   * this journey.
   */
  extraApmLabels?: Record<string, string>;
  /**
   * A list of kbnArchives which will be automatically loaded/unloaded
   * for this journey.
   */
  kbnArchives?: string[];
  /**
   * A list of esArchives which will be automatically loaded/unloaded
   * for this journey.
   */
  esArchives?: string[];
  /**
   * By default the API is used to get a cookie that can be used for all
   * navigation requests to Kibana, so that we don't ever see the login
   * screen. Set this to `false` to disable this behavior.
   */
  skipAutoLogin?: boolean;
  /**
   * Use this to extend the context provided to each step. This function
   * is called with the default context and returns an object that will
   * be merged with the default context provided to each step function.
   */
  extendContext?: (ctx: BaseStepCtx) => CtxExt;
}

export class JourneyConfig<CtxExt extends object> {
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
