/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export const kibanaTable = () => ({
  name: 'kibana_table',
  serialize: context => {
    context.columns.forEach(column => {
      column.aggConfig = column.aggConfig.toJSON();
    });
    return context;
  },
  deserialize: () => {
    // config.visData.columns.forEach(column => {
    //   column.aggConfig = new AggConfig(a, column.aggConfig);
    // });
  },
  validate: tabify => {
    if (!tabify.columns) {
      throw new Error('tabify must have a columns array, even if it is empty');
    }
  },
  from: {
    null: () => {
      return {
        type: 'kibana_table',
        columns: [],
      };
    },
    datatable: context => {
      const converted = {
        columns: context.columns.map(column => {
          return {
            id: column.name,
            title: column.name,
            ...column
          };
        }),
        rows: context.rows.map(row => {
          const crow = {};
          context.columns.forEach(column => {
            crow[column.name] = (row[column.name]);
          });
          return crow;
        })
      };
      return {
        type: 'kibana_table',
        ...converted,
      };
    },
    number: context => {
      return {
        type: 'kibana_table',
        columns: [{ id: 'col-0', title: 'Count' }],
        rows: [{ 'col-0': context }]
      };
    },
    pointseries: context => {
      const converted = {
        tables: [{
          columns: Object.getKeys(context.columns).map(name => {
            const column = context.columns[name];
            return {
              title: column.name || name,
              ...column
            };
          }),
          rows: context.rows.map(row => {
            const crow = [];
            Object.getKeys(context.columns).forEach((column, i) => {
              crow.push(row[i]);
            });
            return crow;
          })
        }]
      };
      return {
        type: 'kibana_table',
        value: converted,
      };
    }
  },
  to: {
    datatable: context => {
      const columns = context.columns.map(column => {
        return { name: column.title, ...column };
      });
      const rows = context.rows.map(row => {
        const converted = {};
        columns.forEach((column) => {
          converted[column.name] = row[column.id];
        });
        return converted;
      });

      return {
        type: 'datatable',
        columns: columns,
        rows: rows,
      };
    },
    pointseries: context => {
      const columns = context.value.tables[0].columns.map(column => {
        return { name: column.title, ...column };
      });
      const rows = context.value.tables[0].rows.map(row => {
        const converted = {};
        columns.forEach((column, i) => {
          converted[column.name] = row[i];
        });
        return converted;
      });

      return {
        type: 'pointseries',
        columns: columns,
        rows: rows,
      };
    }
  }
});
