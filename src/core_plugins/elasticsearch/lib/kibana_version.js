import {
  version as kibanaVersion,
} from '../../../../package.json';

export default {
  // Make the version stubbable to improve testability.
  get() {
    return kibanaVersion;
  },
};
