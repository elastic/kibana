/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import { Jsonc } from '@kbn/bazel-packages';
import { REPO_ROOT } from '@kbn/repo-info';

import { Project as KbnTsProject } from '../../project';
import { PROJECTS } from '../../projects';

export interface TsConfig {
  extends?: string;
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}

export class LintProject {
  static getAll() {
    return PROJECTS.map(
      (p) =>
        new LintProject(p.tsConfigPath, p.directory, Path.relative(REPO_ROOT, p.tsConfigPath), p)
    );
  }

  static getKbnTsProjects(projects: LintProject[]) {
    const cache = new Map<string, KbnTsProject>();
    return projects.map((p) =>
      KbnTsProject.load(
        p.path,
        {
          name: p.kbnTsProject.name,
          disableTypeCheck: p.kbnTsProject.disableTypeCheck,
        },
        {
          cache,
        }
      )
    );
  }

  static parseConfig(path: string) {
    return Jsonc.parse(Fs.readFileSync(path, 'utf8')) as TsConfig;
  }

  constructor(
    public readonly path: string,
    public readonly directory: string,
    public readonly repoRel: string,
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
