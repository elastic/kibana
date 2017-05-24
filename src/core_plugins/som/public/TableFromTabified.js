export default function makeTable(table, configs) {

  const ponder = window.PONDER;

  const pivotBuckets = ['terms', 'significant_terms'];
  const AGGREGATABLE_METRICS = [
    {
      type: 'sum',
      fold: (agg, value) => agg + value,
      seed: value => value
    },
    {
      type: 'min',
      fold: (agg, value) => Math.min(agg, value),
      seed: value => value
    },
    {
      type: 'max',
      fold: (agg, value) => Math.max(agg, value),
      seed: value => value
    },
    {
      type: 'count',
      fold: (agg, value) => agg + value,
      seed: value => value
    },
    {
      type: 'terms',
      fold: (agg, value) => {
        if (!agg.includes(value)){
          agg.push(value);
        }
        return agg;
      },
      seed: value => [value]
    },
    {
      type: 'significant_terms',
      fold: (agg, value) => {
        if (!agg.includes(value)){
          agg.push(value);
        }
        return agg;
      },
      seed: value => [value]
    }
  ];


  class TableFromTabified extends ponder.Table {
    constructor(tabifiedResponse, aggConfigs) {
      super();
      this._table = tabifiedResponse;


      //need to repackage. This is important!!!!
      if (this._table.columns.length > aggConfigs.length) {
        console.log('no metrics were selected, probably better ways to detec this...');
      }


      //check if first aggregation is terms. If not, we need to reject.
      if (this._table.columns.length < 2) {
        throw new Error('Must at least have two columns');
      } else if (!pivotBuckets.includes(this._table.columns[0].aggConfig.type.name)) {
        throw new Error('First field should be pivot/tag field');
      }

      //collapse the aggregations
      this._columns = new Array(aggConfigs.length);
      this._columns[0] = {
        label: this._table.columns[0].title,
        id: true,
        type: this._table.columns[0].aggConfig.type,
        som_type: ponder.Table.IGNORE
      };

      for (let c = 1; c < aggConfigs.length; c += 1) {
        this._columns[c] = {
          label: this._table.columns[c].title,
          id: false,
          type: this._table.columns[c].aggConfig.type,
          som_type: pivotBuckets.includes(this._table.columns[c].aggConfig.type.name) ? ponder.Table.TAGLIST : ponder.Table.ORDINAL
        }
      }

      this._map = {};
      for (let r = 0; r < this._table.rows.length; r++) {
        const key = this._table.rows[r][0].value;

        if (typeof this._map[key] === 'undefined') {
          this._map[key] = new Array(this._columns.length);
          this._map[key][0] = key;
        }
        for (let c = 1; c < this._columns.length; c++) {
          const value = this._table.rows[r][c].value;
          const typeName = this._columns[c].type.name;
          const aggMetric = AGGREGATABLE_METRICS.find(metric => metric.type === typeName);

          if (typeof this._map[key][c] === 'undefined') {
            this._map[key][c] = aggMetric.seed(value);
          } else {
            this._map[key][c] = aggMetric.fold(this._map[key][c], value)
          }
        }
      }
      this._rows = [];
      for (let key in this._map) {
        for (let c = 0; c < this._columns.length; c += 1) {
          if (this._columns[c].som_type === ponder.Table.TAGLIST) {
            this._map[key][c].sort();
          }
        }
        this._rows.push(this._map[key]);
      }

      console.log('constructed da table', this);
      window._daTable = this;

    }

    columnType(index) {
      return this._columns[index].som_type;
    }

    getName() {
      return 'Elasticsearch results';
    }

    columnCount() {
      return this._columns.length;
    }

    rowCount() {
      //of course, we will need to unpack this once we do sub-buckets on terms
      return this._rows.length;
    }

    columnLabel(index) {
      return this._columns[index].label;
    }

    getValue(row, column) {
      if (this._columns[column].som_type === ponder.Table.TAGLIST) {
        return this._rows[row][column].join(';');
      } else {
        return this._rows[row][column];
      }
    }

    getTagCount(row, column) {
      return this._rows[row][column].length;
    }

    getTagValue(row, column, tagIndex) {
      return this._rows[row][column][tagIndex];
    }

    hasTag(rowNumber, columnNumber, tagValue) {
      return this._rows[rowNumber][columnNumber].includes(tagValue);
    }
  }


  return new TableFromTabified(table, configs);

}
