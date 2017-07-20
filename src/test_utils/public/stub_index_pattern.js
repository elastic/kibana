import _ from 'lodash';
import sinon from 'sinon';
import Promise from 'bluebird';
import { IndexPatternProvider } from 'ui/index_patterns/_index_pattern';
import { formatHit } from 'ui/index_patterns/_format_hit';
import { getComputedFields } from 'ui/index_patterns/_get_computed_fields';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import { IndexPatternsFlattenHitProvider } from 'ui/index_patterns/_flatten_hit';
import { IndexPatternsFieldListProvider } from 'ui/index_patterns/_field_list';

export default function (Private) {
  const fieldFormats = Private(RegistryFieldFormatsProvider);
  const flattenHit = Private(IndexPatternsFlattenHitProvider);
  const FieldList = Private(IndexPatternsFieldListProvider);
  const IndexPattern = Private(IndexPatternProvider);

  function StubIndexPattern(pattern, timeField, fields) {
    this.id = pattern;
    this.popularizeField = sinon.stub();
    this.timeFieldName = timeField;
    this.getNonScriptedFields = sinon.spy(IndexPattern.prototype.getNonScriptedFields);
    this.getScriptedFields = sinon.spy(IndexPattern.prototype.getScriptedFields);
    this.getSourceFiltering = sinon.stub();
    this.metaFields = ['_id', '_type', '_source'];
    this.fieldFormatMap = {};
    this.routes = IndexPatternProvider.routes;

    this.toIndexList = _.constant(Promise.resolve(pattern.split(',')));
    this.toDetailedIndexList = _.constant(Promise.resolve(pattern.split(',').map(index => ({
      index,
      min: 0,
      max: 1
    }))));
    this.getComputedFields = getComputedFields.bind(this);
    this.flattenHit = flattenHit(this);
    this.formatHit = formatHit(this, fieldFormats.getDefaultInstance('string'));
    this.formatField = this.formatHit.formatField;

    this._reindexFields = function () {
      this.fields = new FieldList(this, this.fields || fields);
    };

    this.stubSetFieldFormat = function (fieldName, id, params) {
      const FieldFormat = fieldFormats.byId[id];
      this.fieldFormatMap[fieldName] = new FieldFormat(params);
      this._reindexFields();
    };

    this._reindexFields();
  }

  return StubIndexPattern;
}
