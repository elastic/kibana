import minimatch from 'minimatch';

export function matchesAnyGlob(path, globs) {
  return globs.some(pattern => minimatch(path, pattern, {
    dot: true
  }));
}
