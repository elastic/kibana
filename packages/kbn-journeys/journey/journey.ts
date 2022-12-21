/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import { Page } from 'playwright';
import callsites from 'callsites';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrConfigProvider } from '@kbn/test';
import { FtrProviderContext, KibanaServer } from '@kbn/ftr-common-functional-services';

import { Auth } from '../services/auth';
import { InputDelays } from '../services/input_delays';
import { KibanaUrl } from '../services/kibana_url';

import { JourneyFtrHarness } from './journey_ftr_harness';
import { makeFtrConfigProvider } from './journey_ftr_config';
import { JourneyConfig, JourneyConfigOptions } from './journey_config';

export interface BaseStepCtx {
  page: Page;
  log: ToolingLog;
  inputDelays: InputDelays;
  kbnUrl: KibanaUrl;
  kibanaServer: KibanaServer;
}

export type AnyStep = Step<{}>;

export interface Step<CtxExt extends object> {
  name: string;
  index: number;
  fn(ctx: BaseStepCtx & CtxExt): Promise<void>;
}

const CONFIG_PROVIDER_CACHE = new WeakMap<Journey<any>, FtrConfigProvider>();

export class Journey<CtxExt extends object> {
  static convertToFtrConfigProvider(journey: Journey<any>) {
    const cached = CONFIG_PROVIDER_CACHE.get(journey);
    if (cached) {
      return cached;
    }

    const provider = makeFtrConfigProvider(journey.config, journey.#steps);
    CONFIG_PROVIDER_CACHE.set(journey, provider);
    return provider;
  }

  /**
   * Load a journey from a file path
   */
  static async load(path: string) {
    let m;
    try {
      m = await import(path);
    } catch (error) {
      throw new Error(`Unable to load file: ${path}`);
    }

    if (!m || !m.journey) {
      throw new Error(`[${path}] is not a journey`);
    }

    const journey = m.journey;
    if (journey instanceof Journey) {
      return journey;
    }

    const dbg = inspect(journey);
    throw new Error(`[${path}] does not export a Journey like it should, received ${dbg}`);
  }

  #steps: Array<Step<CtxExt>> = [];

  config: JourneyConfig<CtxExt>;

  /**
   * Create a Journey which should be exported from a file in the
   * x-pack/performance/journeys directory.
   */
  constructor(opts?: JourneyConfigOptions<CtxExt>) {
    const path = callsites().at(1)?.getFileName();

    if (!path) {
      throw new Error('unable to determine path of journey config file');
    }

    this.config = new JourneyConfig(path, opts);
  }

  /**
   * Define a step of this Journey. Steps are only separated from each other
   * to aid in reading/debuging the journey and reading it's logging output.
   *
   * If a journey fails, a failure report will be created with a screenshot
   * at the point of failure as well as a screenshot at the end of every
   * step.
   */
  step(name: string, fn: (ctx: BaseStepCtx & CtxExt) => Promise<void>) {
    this.#steps.push({
      name,
      index: this.#steps.length,
      fn,
    });

    return this;
  }

  /** called by FTR to setup tests */
  protected testProvider({ getService }: FtrProviderContext) {
    new JourneyFtrHarness(
      getService('log'),
      getService('config'),
      getService('esArchiver'),
      getService('kibanaServer'),
      new Auth(getService('config'), getService('log'), getService('kibanaServer')),
      this.config
    ).initMochaSuite(this.#steps);
  }
}
