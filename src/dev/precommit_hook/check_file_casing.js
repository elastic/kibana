import { createFailError } from '../run';

const NON_SNAKE_CASE_RE = /[A-Z \-]/;
const ALLOW_NON_SNAKE_CASE = [
  'docs/**/*',
  'packages/eslint-*/**/*',
  'src/babel-*/**/*',
  'tasks/config/**/*',
];

function listFileNames(files) {
  return files
    .map(file => ` - ${file.getRelativePath()}`)
    .join('\n');
}

/**
 * Check that all passed File objects are using valid casing. Every
 * file SHOULD be using snake_case but some files are allowed to stray:
 *
 *  - grunt config: the file name needs to match the module name
 *  - eslint/babel packages: the directory name matches the module
 *    name, which uses kebab-case to mimic other babel/eslint plugins,
 *    configs, and presets
 *  - docs: unsure why, but all docs use kebab-case and that's fine
 *
 * @param {ToolingLog} log
 * @param {Array<File>} files
 * @return {Promise<undefined>}
 */
export async function checkFileCasing(log, files) {
  const errors = [];
  const warnings = [];

  files.forEach(file => {
    const invalid = file.matchesRegex(NON_SNAKE_CASE_RE);
    const allowed = file.matchesAnyGlob(ALLOW_NON_SNAKE_CASE);
    if (!invalid) {
      log.debug('%j uses valid casing', file);
    } else if (allowed) {
      warnings.push(file);
    } else {
      errors.push(file);
    }
  });

  if (warnings.length) {
    log.warning(`Filenames SHOULD be snake_case.\n${listFileNames(warnings)}`);
  }

  if (errors.length) {
    throw createFailError(`Filenames MUST use snake_case.\n${listFileNames(errors)}`);
  }
}
