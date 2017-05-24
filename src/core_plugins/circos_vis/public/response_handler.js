import _ from 'lodash';
import { AggResponseIndexProvider } from 'ui/agg_response/index';

const CircosResponseHandlerProvider = function (Private) {
  const aggResponse = Private(AggResponseIndexProvider);

  return {
    name: 'circos',
    handler: function (vis, response) {
      return new Promise((resolve) => {

        const tableGroup = aggResponse.tabify(vis, response, {
          canSplit: true,
          asAggConfigResults: true
        });

        const layouts = [];
        const series = [];

        _.forIn(tableGroup.tables, (table, key) => {
          if (!table.rows) table = table.tables[0];
          layouts.push({
            id: key,
            label: table.$parent.key,
            len: table.rows.length
          });

          const cnt = [];
          table.rows.forEach(row => {
            for (let serieCnt = 0; serieCnt < row.length - 1; serieCnt++) {
              if (!series[serieCnt]) {
                series[serieCnt] = [];
              }
              if (!cnt[serieCnt]) {
                cnt[serieCnt] = 0;
              }
              const value = row[serieCnt + 1].value;
              series[serieCnt].push({
                block_id: key,
                value: value,
                start: cnt[serieCnt]++,
                position: (cnt[serieCnt] + (cnt[serieCnt] - 1)) / 2,
                end: cnt[serieCnt]
              });
            }
          });
        });

        resolve({
          layout: layouts,
          series: series,
        });
      });
    }
  };
};

export { CircosResponseHandlerProvider };
