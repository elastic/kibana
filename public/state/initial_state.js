import { get } from 'lodash';

export default (path) => {
  const state = {
    app: {}, // Kibana stuff in here
    transient: {
      selectedPage: 'page-f3ce-4bb7-86c8-0417606d6592',
      selectedElement: 'element-d88c-4bbd-9453-db22e949b92e',
      resolvedArgs: {},
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
            expression: `demodata().pointseries(y="median(cost)", x=time, color="project").plot(
              palette=palette(#04BFBF, #CAFCD8, #F7E967, #A9CF54, #588F27),
              defaultStyle=seriesStyle(bars=0, lines=0, weight=0, points=1)
            )`,
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
                  y: [{
                    type: 'string',
                    value: 'median(cost)',
                  }],
                  x: [{
                    type: 'string',
                    value: 'time',
                  }],
                  color: [{
                    type: 'string',
                    value: 'project',
                  }],
                },
              }, {
                type: 'function',
                function: 'plot',
                arguments: {
                  palette: [{
                    type: 'expression',
                    chain: [{
                      type: 'function',
                      function: 'palette',
                      arguments: {
                        _: [{
                          type: 'string',
                          value: '#04BFBF',
                        }, {
                          type: 'string',
                          value: '#CAFCD8',
                        }, {
                          type: 'string',
                          value: '#F7E967',
                        }, {
                          type: 'string',
                          value: '#A9CF54',
                        }, {
                          type: 'string',
                          value: '#588F27',
                        }],
                      },
                    }],
                  }],
                  defaultStyle: [{
                    type: 'expression',
                    chain: [{
                      type: 'function',
                      function: 'seriesStyle',
                      arguments: {
                        bars: [{
                          type: 'number',
                          value: 0,
                        }],
                        lines: [{
                          type: 'number',
                          value: 0,
                        }],
                        weight: [{
                          type: 'number',
                          value: 0,
                        }],
                        points: [{
                          type: 'number',
                          value: 1,
                        }],
                      },
                    }],
                  }],
                },
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
