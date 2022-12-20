/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { PackageMap } from '@kbn/package-map';

import { readTsConfig, parseTsConfig, TsConfig } from './ts_configfile';

export interface ProjectOptions {
  name?: string;
  disableTypeCheck?: boolean;
}

type KbnRef = string | { path: string; force?: boolean };
function isValidKbnRefs(refs: unknown): refs is KbnRef[] {
  return (
    Array.isArray(refs) &&
    refs.every(
      (r) =>
        typeof r === 'string' ||
        (typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string')
    )
  );
}

export class Project {
  /**
   * The parsed config file from disk
   */
  public config: TsConfig;

  /** absolute path to the tsconfig file defininig this project */
  public readonly path: string;
  /** repo relative path to the tsconfig file defininig this project */
  public readonly repoRel: string;
  /** name of this project */
  public readonly name: string;
  /** The directory containing this ts project */
  public readonly dir: string;
  /** The directory containing this ts project */
  public readonly directory: string;

  /** absolute path to the tsconfig file that will be generated for type checking this file */
  public readonly typeCheckConfigPath: string;
  /** `true` if we want to explicitly exclude this entire project from type checking */
  public readonly disableTypeCheck: boolean;

  constructor(private readonly others: Map<string, Project>, path: string, opts?: ProjectOptions) {
    if (!Path.isAbsolute(path)) {
      throw new Error(`Unable to create ts Project from relative path [${path}]`);
    }

    this.path = path;
    this.config = readTsConfig(this.path);
    this.repoRel = Path.relative(REPO_ROOT, path);
    this.name = opts?.name || this.repoRel;
    this.dir = this.directory = Path.dirname(path);

    this.typeCheckConfigPath = Path.resolve(
      this.directory,
      Path.basename(this.repoRel, '.json') + '.type_check.json'
    );

    this.disableTypeCheck = !!opts?.disableTypeCheck;
  }

  /**
   * updates the project so that the tsconfig file will be
   * read from disk the next time that this.config is accessed
   */
  public reloadFromDisk() {
    this.config = readTsConfig(this.path);
  }

  public overrideConfig(jsonc: string) {
    try {
      this.config = parseTsConfig(this.path, jsonc);
    } catch (error) {
      throw new Error(`unable to parse jsonc in order to override config: ${error.message}`);
    }
  }

  /**
   * Gets the base config file for this tsconfig file. If the
   * "extends" key is not defined this returns undefined
   */
  public getBase(): Project | undefined {
    if (!this.config.extends) {
      return undefined;
    }

    return this.getOther(
      Path.resolve(this.directory, this.config.extends),
      `extends: ${JSON.stringify(this.config.extends)}`
    );
  }

  /**
   * Get the kbnRefs for this project
   */
  public getKbnRefs(pkgMap: PackageMap) {
    if (!this.config.kbn_references) {
      return [];
    }

    if (!isValidKbnRefs(this.config.kbn_references)) {
      throw new Error(`invalid kbn_references in ${this.name}`);
    }

    return this.config.kbn_references.flatMap((ref) => {
      if (typeof ref !== 'string') {
        return (
          this.getOther(
            Path.resolve(this.directory, ref.path),
            `kbn_references: ${JSON.stringify(ref)}`
          ) ?? []
        );
      }

      const pkgDir = pkgMap.get(ref);
      if (!pkgDir) {
        throw new Error(`invalid kbn_references in ${this.name}: ${ref} is not a known package`);
      }

      return (
        this.getOther(
          Path.resolve(pkgDir, 'tsconfig.json'),
          `kbn_references: ${JSON.stringify(ref)}`
        ) ?? []
      );
    });
  }

  private getOther(abs: string, from: string) {
    const cached = this.others.get(abs);
    if (cached) {
      return cached;
    }

    try {
      const base = new Project(this.others, abs);
      this.others.set(abs, base);
      return base;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return undefined;
      }
      throw new Error(`Failed to load tsconfig file from ${from}: ${error.message}`);
    }
  }
}
