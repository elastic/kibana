import _ from 'lodash';

export class Embeddable {
  constructor(config) {
    this.title = config.title || '';
    this.editUrl = config.editUrl || '';
    this.hasSearch = _.has(config, 'hasSearch') ? config.hasSearch : false;
    this.searchLabel = config.searchLabel || '';
  }
}
