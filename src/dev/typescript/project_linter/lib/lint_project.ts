/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import { Jsonc } from '@kbn/bazel-packages';

import { PROJECTS } from '../../projects';
import { Project as KbnTsProject } from '../../project';

export interface TsConfig {
  extends?: string;
  compilerOptions?: Record<string, unknown>;
  [key: string]: unknown;
}

export class LintProject {
  static getAll() {
    return PROJECTS.map((p) => new LintProject(p.tsConfigPath, p.directory, p));
  }

  static parseConfig(path: string) {
    return Jsonc.parse(Fs.readFileSync(path, 'utf8')) as TsConfig;
  }

  static getKbnTsProject(project: LintProject) {
    return project.kbnTsProject;
  }

  constructor(
    public readonly path: string,
    public readonly directory: string,
    private readonly kbnTsProject: KbnTsProject
  ) {}

  private _config: TsConfig | undefined;
  public get config() {
    return (this._config ??= LintProject.parseConfig(this.path));
  }

  refreshTsConfig() {
    this._config = undefined;
  }
}
