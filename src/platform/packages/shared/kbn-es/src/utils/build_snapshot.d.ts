/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
interface BuildSnapshotOptions {
  license: string;
  sourcePath: string;
  log: ToolingLog;
  platform?: string;
}
/**
 * Creates archive from source
 *
 * Gradle tasks:
 *   $ ./gradlew tasks --all | grep 'distribution.*assemble\s'
 *   :distribution:archives:darwin-tar:assemble
 *   :distribution:archives:linux-tar:assemble
 *   :distribution:archives:windows-zip:assemble
 */
export declare function buildSnapshot({
  license,
  sourcePath,
  log,
  platform,
}: BuildSnapshotOptions): Promise<string>;
export declare function archiveForPlatform(
  platform: NodeJS.Platform,
  license: string
): {
  format: string;
  ext: string;
  task: string;
  platform: string;
};
export {};
