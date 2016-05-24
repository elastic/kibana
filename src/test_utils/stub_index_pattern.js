import _ from 'lodash';
import sinon from 'sinon';
import Promise from 'bluebird';
import IndexedArray from 'ui/indexed_array';
import IndexPattern from 'ui/index_patterns/_index_pattern';
import formatHit from 'ui/index_patterns/_format_hit';
import getComputedFields from 'ui/index_patterns/_get_computed_fields';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import IndexPatternsFlattenHitProvider from 'ui/index_patterns/_flatten_hit';
import IndexPatternsFieldProvider from 'ui/index_patterns/_field';
export default function (Private) {
  let fieldFormats = Private(RegistryFieldFormatsProvider);
  let flattenHit = Private(IndexPatternsFlattenHitProvider);

  let Field = Private(IndexPatternsFieldProvider);

  function StubIndexPattern(pattern, timeField, fields) {
    this.id = pattern;
    this.popularizeField = sinon.spy();
    this.timeFieldName = timeField;
    this.getNonScriptedFields = sinon.spy();
    this.getScriptedFields = sinon.spy();
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

    this._indexFields = function () {
      this.fields = new IndexedArray({
        index: ['name'],
        group: ['type'],
        initialSet: fields.map(function (field) {
          return new Field(this, field);
        }, this)
      });
    };

    this._indexFields();
  }

  return StubIndexPattern;
};
