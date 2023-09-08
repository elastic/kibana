/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields contain information about an installed software package. It contains general information about a package, such as name, version or size. It also contains installation details, such as time or location.
 */
export interface EcsPackage {
  /**
   * Package architecture.
   */
  architecture?: string;
  /**
   * Additional information about the build version of the installed package.
   * For example use the commit SHA of a non-released package.
   */
  build_version?: string;
  /**
   * Checksum of the installed package for verification.
   */
  checksum?: string;
  /**
   * Description of the package.
   */
  description?: string;
  /**
   * Indicating how the package was installed, e.g. user-local, global.
   */
  install_scope?: string;
  /**
   * Time when package was installed.
   */
  installed?: string;
  /**
   * License under which the package was released.
   * Use a short name, e.g. the license identifier from SPDX License List where possible (https://spdx.org/licenses/).
   */
  license?: string;
  /**
   * Package name
   */
  name?: string;
  /**
   * Path where the package is installed.
   */
  path?: string;
  /**
   * Home page or reference URL of the software in this package, if available.
   */
  reference?: string;
  /**
   * Package size in bytes.
   */
  size?: number;
  /**
   * Type of package.
   * This should contain the package file type, rather than the package manager name. Examples: rpm, dpkg, brew, npm, gem, nupkg, jar.
   */
  type?: string;
  /**
   * Package version
   */
  version?: string;
}
