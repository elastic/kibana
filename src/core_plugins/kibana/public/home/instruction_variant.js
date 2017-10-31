export const INSTRUCTION_VARIANT = {
  OSX: 'osx',
  DEB: 'deb',
  RPM: 'rpm',
  DOCKER: 'docker',
  WINDOWS: 'windows',
  NODE: 'node',
  DJANGO: 'django',
  FLASK: 'flask'
};

const DISPLAY_MAP = {};
DISPLAY_MAP[INSTRUCTION_VARIANT.OSX] = 'OSX';
DISPLAY_MAP[INSTRUCTION_VARIANT.DEB] = 'DEB';
DISPLAY_MAP[INSTRUCTION_VARIANT.RPM] = 'RPM';
DISPLAY_MAP[INSTRUCTION_VARIANT.DOCKER] = 'Docker';
DISPLAY_MAP[INSTRUCTION_VARIANT.WINDOWS] = 'Windows';
DISPLAY_MAP[INSTRUCTION_VARIANT.NODE] = 'Node.js';
DISPLAY_MAP[INSTRUCTION_VARIANT.DJANGO] = 'Django';
DISPLAY_MAP[INSTRUCTION_VARIANT.FLASK] = 'Flask';

/**
 * Convert instruction variant id into display text.
 *
 * @params {String} id - instruction variant id as defined from INSTRUCTION_VARIANT
 * @return {String} display name
 */
export function getDisplayText(id) {
  if (id in DISPLAY_MAP) {
    return DISPLAY_MAP[id];
  }
  return id;
}
