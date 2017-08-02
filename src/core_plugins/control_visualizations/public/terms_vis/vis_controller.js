import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { buildPhraseFilter } from 'ui/filter_manager/lib/phrase';
import { TermsVis } from './components/terms_vis';

class VisController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.controls = [];

    this.queryBarUpdateHandler = this.updateSelected.bind(this);
    this.vis.API.queryFilter.on('update', this.queryBarUpdateHandler);
  }

  render(visData, status) {
    if (status.params) {
      this.fetchTerms();
    }
    return new Promise(() => {});
  }

  resize() {}

  destroy() {
    this.vis.API.queryFilter.off('update', this.queryBarUpdateHandler);
    unmountComponentAtNode(this.el);
  }

  drawTermsVis() {
    render(
      <TermsVis controls={this.controls} setFilter={this.setFilter.bind(this)} removeFilter={this.removeFilter.bind(this)} />,
      this.el);
  }

  fetchTerms() {
    this.controls = [];

    const createRequestPromises = this.vis.params.fields
    .filter((field) => {
      return field.indexPattern && field.fieldName;
    })
    .map(async (field) => {
      const indexPattern = await this.vis.API.indexPatterns.get(field.indexPattern);
      const searchSource = new this.vis.API.SearchSource();
      searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
      searchSource.size(0);
      searchSource.index(indexPattern);
      searchSource.aggs(this.termsAgg(indexPattern.fields.byName[field.fieldName], 5, 'desc'));

      const defer = {};
      defer.promise = new Promise((resolve, reject) => {
        defer.resolve = resolve;
        defer.reject = reject;
      });
      defer.promise.then((resp) => {
        const terms = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
          return { label: bucket.key, value: bucket.key };
        });
        this.controls.push({
          selected: this.getSelected(indexPattern.id, field.fieldName),
          indexPattern: indexPattern,
          field: indexPattern.fields.byName[field.fieldName],
          label: field.label ? field.label : field.fieldName,
          terms: terms
        });
        this.drawTermsVis();
      });
      return searchSource._createRequest(defer);
    });
    Promise.all(createRequestPromises).then(requests => {
      this.vis.API.fetch.these(requests);
    });
  }

  setFilter(field, value, indexPattern) {
    // to avoid duplicate filters, remove any old filters for this index pattern field
    this.findFilters(indexPattern.id, field.name).forEach((existingFilter) => {
      this.vis.API.queryFilter.removeFilter(existingFilter);
    });

    // add new filter
    const newFilter = buildPhraseFilter(field, value, indexPattern);
    this.vis.API.queryFilter.addFilters(newFilter);
  }

  removeFilter(field, indexPattern) {
    const filters = this.findFilters(indexPattern.id, field.name);
    filters.forEach((filter) => {
      this.vis.API.queryFilter.removeFilter(filter);
    });
  }

  findFilters(indexPatternId, fieldName) {
    const filters = _.flatten([this.vis.API.queryFilter.getAppFilters(), this.vis.API.queryFilter.getGlobalFilters()]);
    return filters.filter(function (filter) {
      if (_.has(filter, 'script') && _.get(filter, 'meta.index') === indexPatternId && _.get(filter, 'meta.field') === fieldName) {
        //filter is a scripted filter for this index/field
        return true;
      } else if (_.has(filter, ['query', 'match', fieldName]) && _.get(filter, 'meta.index') === indexPatternId) {
        //filter is a match filter for this index/field
        return true;
      }
      return false;
    });
  }

  getSelected(indexPatternId, fieldName) {
    const filters = this.findFilters(indexPatternId, fieldName);
    if (filters.length === 0) {
      return '';
    } else {
      if (_.has(filters[0], 'script')) {
        return _.get(filters[0], 'script.script.params.value');
      }
      return _.get(filters[0], ['query', 'match', fieldName, 'query']);
    }
  }

  termsAgg(field, size, direction) {
    const terms = {
      'size': size,
      'order': {
        '_count': direction
      }
    };
    if (field.scripted) {
      terms.script = {
        inline: field.script,
        lang: field.lang
      };
      terms.valueType = field.type === 'number' ? 'float' : field.type;
    } else {
      terms.field = field.name;
    }
    return {
      'termsAgg': {
        'terms': terms
      }
    };
  }

  updateSelected() {
    this.controls = this.controls.map((control) => {
      control.selected = this.getSelected(control.indexPattern.id, control.field.name);
      return control;
    });
    this.drawTermsVis();
  }
}

export { VisController };
