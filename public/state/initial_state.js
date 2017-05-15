import { get } from 'lodash';

export default (path) => {
  const state = {
    app: {}, // Kibana stuff in here
    throwAway: {
      expression: `demodata().pointseries(y='median(age)', x=time, color="project").plot(
  palette=palette(#04BFBF, #CAFCD8, #F7E967, #A9CF54, #588F27),
  defaultStyle=seriesStyle(bars=1, lines=0, weight=0, points=0)
)`,
      renderable: null,
    },
    transient: {
      selectedPage: 'page-f3ce-4bb7-86c8-0417606d6592',
      selectedElement: 'element-d88c-4bbd-9453-db22e949b92e',
      resolvedArgs: {
        'element-d88c-4bbd-9453-db22e949b92e': {
          expressionContexts: {
            0: {
              // metadata form demodata()
              state: 'ready',
              value: {
                type: 'datatable',
                columns: [{
                  type: 'date',
                  name: 'time',
                }, {
                  type: 'number',
                  name: 'cost',
                }, {
                  type: 'string',
                  name: 'username',
                }, {
                  type: 'number',
                  name: 'price',
                }, {
                  type: 'number',
                  name: 'age',
                }, {
                  type: 'string',
                  name: 'country',
                }],
              },
              error: null,
            },
          },
        },
      },
    },
    persistent: {
      workpad: {
        name: 'Untitled Workpad',
        id: 'workpad-2235-4af1-b781-24e42a453e5b',
        width: 600,
        height: 720,
        page: 0,
        pages: [{
          id: 'page-f3ce-4bb7-86c8-0417606d6592',
          name: 'Name of the page',
          style: {
            backgroundColor: '#fff',
          },
          elements: [{
            id: 'element-d88c-4bbd-9453-db22e949b92e',
            // datasource: 'asset-f5d8-4615-9463-a7b1e2850523',
            position: {
              top: 100,
              left: 200,
              height: 400,
              width: 600,
              rotation: 90,
            },
            expression: 'demodata().pointseries(x=time, y=.math("sum(cost)")).plot()',
            ast: {
              type: 'expression',
              chain: [{
                type: 'function',
                function: 'demodata',
                arguments: {},
              }, {
                type: 'function',
                function: 'pointseries',
                arguments: {
                  x: [{
                    type: 'string',
                    value: 'time',
                  }],
                  y: [{
                    type: 'partial',
                    chain: [{
                      type: 'function',
                      function: 'math',
                      arguments: {
                        _: [{
                          type: 'string',
                          value: 'sum(cost)',
                        }],
                      },
                    }],
                  }],
                },
              }, {
                type: 'function',
                function: 'plot',
                arguments: {},
              }],
            },
          }],
        }],
      },
    },
  };

  if (!path) {
    return state;
  }

  return get(state, path);
};
