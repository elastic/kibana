import { ToolingLog } from '@kbn/dev-utils';

import { File } from '../file';

export function pickFilesToLint(log: ToolingLog, files: File[]) {
  return files.filter(file => file.isTypescript());
}
