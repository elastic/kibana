import _ from 'lodash';

/**
 * A poor excuse for a mock just to get some basic tests to run in jest without requiring the injector.
 * This could be improved if we extract the appState and state classes externally of their angular providers.
 * @return {AppStateMock}
 */
export function getAppStateMock() {
  class AppStateMock {
    constructor(defaults) {
      _.forEach(defaults, (value, key) => {
        this[key] = value;
      });
    }

    on() {}
    off() {}
    toJSON() { return ''; }
    save() {}
  }

  return AppStateMock;
}
