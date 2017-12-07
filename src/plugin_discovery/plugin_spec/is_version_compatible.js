import {
  cleanVersion,
  versionSatisfies
} from '../../utils/version';

export function isVersionCompatible(version, compatibleWith) {
  // the special "kibana" version can be used to always be compatible,
  // but is intentionally not supported by the plugin installer
  if (version === 'kibana') {
    return true;
  }

  return versionSatisfies(
    cleanVersion(version),
    cleanVersion(compatibleWith)
  );
}
