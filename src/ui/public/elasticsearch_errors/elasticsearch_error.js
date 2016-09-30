import _ from 'lodash';

export default class ElasticsearchError {
  constructor(error) {
    this.error = error;

    this.getRootCauses = this.getRootCauses.bind(this);
    this.hasRootCause = this.hasRootCause.bind(this);

    if (!this.getRootCauses().length) {
      throw new Error(
        'ElasticsearchError must be instantiated with an elasticsearch error, i.e. it must have' +
        `a resp.error.root_cause property. Instead got ${JSON.stringify(error)}`
      );
    }
  }

  static hasRootCause(error, cause) {
    try {
      const esError = new ElasticsearchError(error);
      return esError.hasRootCause(cause);
    } catch (err) {
      // we assume that any failure represents a validation error
      // in the ElasticsearchError constructor
      return false;
    }
  }

  getRootCauses() {
    const rootCauses = _.get(this.error, 'resp.error.root_cause');
    return _.pluck(rootCauses, 'reason');
  }

  hasRootCause(cause) {
    const normalizedCause = cause.toLowerCase();
    const rootCauses = this.getRootCauses();
    const matchingCauses = rootCauses.filter(rootCause => {
      const normalizedRootCause = rootCause.toLowerCase();
      return normalizedRootCause.indexOf(normalizedCause) !== -1;
    });
    return matchingCauses.length !== 0;
  }
}
