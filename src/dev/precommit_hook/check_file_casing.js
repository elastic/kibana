import { createFailError } from './fail';

const NON_SNAKE_CASE_RE = /[A-Z \-]/;
const ALLOW_NON_SNAKE_CASE = [
  'docs/**/*',
  'packages/eslint-*/**/*',
  'src/babel-*/**/*',
  'tasks/config/**/*',
  '**/vendor/**/*',
];

function listFileNames(files) {
  return files
    .map(file => ` - ${file.getRelativePath()}`)
    .join('\n');
}

export async function checkFileCasing(log, files) {
  const errors = [];
  const warnings = [];

  files.forEach(file => {
    const invalid = file.getRelativePath().match(NON_SNAKE_CASE_RE);
    const allowed = file.matchesAnyGlob(ALLOW_NON_SNAKE_CASE);
    if (invalid) {
      (allowed ? warnings : errors).push(file);
    }
  });

  if (warnings.length) {
    log.warning(`Filenames should be snake_case.\n${listFileNames(warnings)}`);
  }

  if (!errors.length) {
    return true;
  }

  throw createFailError(`Filenames must use snake_case.\n${listFileNames(errors)}`);
}
