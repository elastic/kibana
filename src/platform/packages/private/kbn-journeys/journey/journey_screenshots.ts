/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fsp from 'fs/promises';

import * as Rx from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import { FtrScreenshotFilename } from '@kbn/ftr-screenshot-filename';

import type { AnyStep } from './journey';

interface StepShot {
  type: 'success' | 'failure';
  title: string;
  filename: string;
  fullscreenFilename: string;
}

interface Manifest {
  steps: StepShot[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';
const isStepShot = (v: unknown): v is StepShot =>
  isObj(v) &&
  (v.type === 'success' || v.type === 'failure') &&
  isString(v.title) &&
  isString(v.filename);

const write = async (path: string, content: string | Buffer) => {
  await Fsp.mkdir(Path.dirname(path), { recursive: true });
  await Fsp.writeFile(path, content);
};

export class JourneyScreenshots {
  static async load(journeyName: string) {
    const screenshots = new JourneyScreenshots(journeyName);

    const json = await Fsp.readFile(screenshots.#manifestPath, 'utf8');
    const manifest = JSON.parse(json);

    if (!isObj(manifest)) {
      throw new Error('invalid manifest, json parsed but not to an object');
    }

    const { steps } = manifest;

    if (!Array.isArray(steps) || !steps.every(isStepShot)) {
      throw new Error('invalid manifest, steps must be an array of StepShot objects');
    }

    screenshots.#manifest = { steps };
    return screenshots;
  }

  readonly #dir: string;
  readonly #manifestPath: string;

  #manifest: Manifest = {
    steps: [],
  };

  constructor(journeyName: string) {
    this.#dir = Path.resolve(REPO_ROOT, 'data/journey_screenshots', journeyName);
    this.#manifestPath = Path.resolve(this.#dir, 'manifest.json');
  }

  readonly #isLocked = new Rx.BehaviorSubject<boolean>(false);
  async lock(fn: () => Promise<void>) {
    if (this.#isLocked.getValue()) {
      do {
        await Rx.firstValueFrom(this.#isLocked.pipe(Rx.skip(1)));
      } while (this.#isLocked.getValue());
    }

    try {
      this.#isLocked.next(true);
      await fn();
    } finally {
      this.#isLocked.next(false);
    }
  }

  async addError(step: AnyStep, screenshot: Buffer, fullscreenScreenshot: Buffer) {
    await this.lock(async () => {
      const filename = FtrScreenshotFilename.create(`${step.index}-${step.name}-failure`);
      const fullscreenFilename = FtrScreenshotFilename.create(
        `${step.index}-${step.name.replace(/\s/g, '-')}-failure-fullscreen`
      );
      this.#manifest.steps.push({
        type: 'failure',
        title: `Step #${step.index + 1}: ${step.name} - FAILED`,
        filename,
        fullscreenFilename,
      });

      await Promise.all([
        write(Path.resolve(this.#dir, 'manifest.json'), JSON.stringify(this.#manifest)),
        write(Path.resolve(this.#dir, filename), screenshot),
        write(Path.resolve(this.#dir, fullscreenFilename), fullscreenScreenshot),
      ]);
    });
  }

  async addSuccess(step: AnyStep, screenshot: Buffer, fullscreenScreenshot: Buffer) {
    await this.lock(async () => {
      const filename = FtrScreenshotFilename.create(`${step.index}-${step.name}`);
      const fullscreenFilename = FtrScreenshotFilename.create(
        `${step.index}-${step.name.replace(/\s/g, '-')}-fullscreen`
      );
      this.#manifest.steps.push({
        type: 'success',
        title: `Step #${step.index + 1}: ${step.name} - DONE`,
        filename,
        fullscreenFilename,
      });

      await Promise.all([
        write(Path.resolve(this.#dir, 'manifest.json'), JSON.stringify(this.#manifest)),
        write(Path.resolve(this.#dir, filename), screenshot),
        write(Path.resolve(this.#dir, fullscreenFilename), fullscreenScreenshot),
      ]);
    });
  }

  get() {
    return this.#manifest.steps.map((stepShot) => ({
      ...stepShot,
      path: Path.resolve(this.#dir, stepShot.filename),
      fullscreenPath: Path.resolve(this.#dir, stepShot.fullscreenFilename),
    }));
  }
}
