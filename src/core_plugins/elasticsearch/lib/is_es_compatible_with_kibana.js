/**
 * Let's weed out the ES versions that won't work with a given Kibana version.
 * 1. Major version differences will never work together.
 * 2. Older versions of ES won't work with newer versions of Kibana.
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

  // Reject mismatching major version numbers.
  if (esVersionNumbers.major !== kibanaVersionNumbers.major) {
    return false;
  }

  // Reject older minor versions of ES.
  if (esVersionNumbers.minor < kibanaVersionNumbers.minor) {
    return false;
  }

  return true;
}
