/**
 * Determines whether the version of Kibana is compatible with the version of
 * Elasticsearch. Compatibility means that the versions are expected to behave
 * at least satisfactorily together. Incompatible versions likely won't work at
 * all.
 */

import semver from 'semver';

export default function isEsCompatibleWithKibana(esVersion, kibanaVersion) {
  const esVersionNumbers = {
    major: semver.major(esVersion),
    minor: semver.minor(esVersion),
    patch: semver.patch(esVersion),
  };

  const kibanaVersionNumbers = {
    major: semver.major(kibanaVersion),
    minor: semver.minor(kibanaVersion),
    patch: semver.patch(kibanaVersion),
  };

  // Accept the next major version of ES.
  if (esVersionNumbers.major === kibanaVersionNumbers.major + 1) {
    return true;
  }

  // Reject any other major version mismatches with ES.
  if (esVersionNumbers.major !== kibanaVersionNumbers.major) {
    return false;
  }

  // Reject older minor versions of ES.
  if (esVersionNumbers.minor < kibanaVersionNumbers.minor) {
    return false;
  }

  return true;
}
