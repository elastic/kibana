/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaPackageManifest } from '@kbn/repo-packages';
import type { ModuleGroup, ModuleVisibility } from '@kbn/repo-info/types';
import type { ModuleType } from './module_type';
import type { PkgInfo } from './pkg_info';

export interface ModuleId {
  /** Type of the module */
  type: ModuleType;
  /** Specifies the group to which this module belongs */
  group: ModuleGroup;
  /** Specifies the module visibility, i.e. whether it can be accessed by everybody or only modules in the same group */
  visibility: ModuleVisibility;
  /** repo relative path to the module's source file */
  repoRel: string;
  /** info about the package the source file is within, in the case the file is found within a package */
  pkgInfo?: PkgInfo;
  /** The type of package, as described in the manifest */
  manifest?: KibanaPackageManifest;
  /** path segments of the dirname of this */
  dirs: string[];
}
