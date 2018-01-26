export const INSTRUCTION_VARIANT = {
  OSX: 'osx',
  DEB: 'deb',
  RPM: 'rpm',
  DOCKER: 'docker',
  WINDOWS: 'windows',
  NODE: 'node',
  DJANGO: 'django',
  FLASK: 'flask',
  RAILS: 'rails',
  RACK: 'rack',
  JS: 'js',
};

const DISPLAY_MAP = {
  [INSTRUCTION_VARIANT.OSX]: 'macOS',
  [INSTRUCTION_VARIANT.DEB]: 'DEB',
  [INSTRUCTION_VARIANT.RPM]: 'RPM',
  [INSTRUCTION_VARIANT.DOCKER]: 'Docker',
  [INSTRUCTION_VARIANT.WINDOWS]: 'Windows',
  [INSTRUCTION_VARIANT.NODE]: 'Node.js',
  [INSTRUCTION_VARIANT.DJANGO]: 'Django',
  [INSTRUCTION_VARIANT.FLASK]: 'Flask',
  [INSTRUCTION_VARIANT.RAILS]: 'Ruby on Rails',
  [INSTRUCTION_VARIANT.RACK]: 'Rack',
  [INSTRUCTION_VARIANT.JS]: 'JS',
};

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
