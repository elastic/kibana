import { IEsSearchRequest } from '../../../data/server';
import { IEsSearchResponse } from '../../../data/common';
import type { DataRequestHandlerContext } from '../../../data/server';
import type { IRouter } from '../../../../core/server';
import { TRACE_EVENTS_TOPN_SEARCH_ROUTE_PATH } from '../../common';

const bigInt = require("big-integer");

export function registerTraceEventsTopNSearchRoute(router: IRouter<DataRequestHandlerContext>) {
  router.get(
    {
      path: TRACE_EVENTS_TOPN_SEARCH_ROUTE_PATH,
      validate: false
    },
    async (context, request, response) => {
      const resTopNStackTraces = await context
        .search!.search(
        {
          params: {
            index: 'profiling-events',
            wait_for_completion_timeout: '5m',
            keep_alive: '5m',
            query: {
              bool: {
                must: [
                  {
                    term: {
                      "ProjectID": {
                        value: 1,
                        boost: 1.0
                      }
                    }
                  },
                  {
                    range: {
                      "TimeStamp": {
                        gte: "2021-12-01 13:05:04.000",
                        lt: "2021-12-03 13:13:44.000",
                        format: "yyyy-MM-dd HH:mm:ss.SSS",
                        time_zone: "Z",
                        boost: 1.0
                      }
                    }
                  }
                ],
              },
            },
            aggs: {
              histogram: {
                date_histogram: {
                  field: "TimeStamp",
                  fixed_interval: "100s"
                },
                aggs: {
                  group_by: {
                    multi_terms: {
                      terms: [{
                        field: "StackTraceIDA"
                      },{
                        field: "StackTraceIDB"
                      }],
                      size: 10
                    }
                  }
                }
              }
            },
          },
        } as IEsSearchRequest,
        {}
      ).toPromise();

      var docIDs = []
      resTopNStackTraces.rawResponse.aggregations.histogram.buckets.forEach(timeInterval => {
        timeInterval.group_by.buckets.forEach(stackTraceItem => {
          var bigIntKey0 = bigInt(stackTraceItem.key[0]);
          var bigIntKey1 = bigInt(stackTraceItem.key[1]);
          var docID = getDocID(bigIntKey0, bigIntKey1)

          docIDs.push(docID)
        })
      })

      const resTraceMetadata = await context
        .search!.search(
        {
          params: {
            index: 'profiling-stacktraces/_mget',
            wait_for_completion_timeout: '5m',
            keep_alive: '5m',
            query: {
              terms: {
                "_id": docIDs,
                boost: 1.0
              }
            },
          },
        } as IEsSearchRequest,
        {}
      ).toPromise();

      return response.ok({
        body: {
          topNStackTraces: (resTopNStackTraces as IEsSearchResponse).rawResponse.aggregations,
          traceMetadata: resTraceMetadata
        },
      });
    }
  );
}

function getDocID(hi: bigint, lo: bigint) {
  var hex = hi.toString(16);
  var hexLo = lo.toString(16);
  hex = '0'.repeat(16 - hex.length) + hex
  hex = hex + '0'.repeat(16 - hexLo.length) + hexLo

  var bin = [];
  var i = 0;
  var d;
  var b;
  while (i < hex.length) {
    d = parseInt(hex.slice(i, i + 2), 16);
    b = String.fromCharCode(d);
    bin.push(b);
    i += 2;
  }

  return btoa(bin.join('')).replace('+', '-').replace('/', '_')
}
