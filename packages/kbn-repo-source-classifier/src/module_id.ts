/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ModuleType } from './module_type';
import { PkgInfo } from './pkg_info';

export interface ModuleId {
  /** Type of the module */
  type: ModuleType;
  /** repo relative path to the module's source file */
  repoRel: string;
  /** info about the package the source file is within, in the case the file is found within a package */
  pkgInfo?: PkgInfo;
  /** path segments of the dirname of this */
  dirs: string[];
}
