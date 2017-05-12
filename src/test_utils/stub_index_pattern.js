import _ from 'lodash';
import sinon from 'sinon';
import Promise from 'bluebird';
import IndexPattern from 'ui/index_patterns/_index_pattern';
import formatHit from 'ui/index_patterns/_format_hit';
import getComputedFields from 'ui/index_patterns/_get_computed_fields';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import IndexPatternsFlattenHitProvider from 'ui/index_patterns/_flatten_hit';
import IndexPatternsFieldListProvider from 'ui/index_patterns/_field_list';

export default function (Private) {
  const fieldFormats = Private(RegistryFieldFormatsProvider);
  const flattenHit = Private(IndexPatternsFlattenHitProvider);
  const FieldList = Private(IndexPatternsFieldListProvider);

  function StubIndexPattern(pattern, timeField, fields) {
    this.id = pattern;
    this.popularizeField = sinon.spy();
    this.timeFieldName = timeField;
    this.getNonScriptedFields = sinon.spy();
    this.getScriptedFields = sinon.spy();
    this.getSourceFiltering = sinon.spy();
    this.metaFields = ['_id', '_type', '_source'];
    this.fieldFormatMap = {};
    this.routes = IndexPattern.routes;

    this.toIndexList = _.constant(Promise.resolve([pattern]));
    this.toDetailedIndexList = _.constant(Promise.resolve([
      {
        index: pattern,
        min: 0,
        max: 1
      }
    ]));
    this.getComputedFields = _.bind(getComputedFields, this);
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
