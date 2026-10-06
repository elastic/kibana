import moment from 'moment-timezone';
import type { estypes } from '@elastic/elasticsearch';
import type { AggConfigs, AggConfig } from '../../..';
/**
 * This function will transform an ES response containg a time split (using a filters aggregation before the metrics or date histogram aggregation),
 * merging together all branches for the different time ranges into a single response structure which can be tabified into a single table.
 *
 * If there is just a single time shift, there are no separate branches per time range - in this case only the date histogram keys are shifted by the
 * configured amount of time.
 *
 * To do this, the following steps are taken:
 * * Traverse the response tree, tracking the current agg config
 * * Once the node which would contain the time split object is found, merge all separate time range buckets into a single layer of buckets of the parent agg
 * * Recursively repeat this process for all nested sub-buckets
 *
 * Example input:
 * ```
 * "aggregations" : {
    "product" : {
      "buckets" : [
        {
          "key" : "Product A",
          "doc_count" : 512,
          "first_year" : {
            "doc_count" : 418,
            "overall_revenue" : {
              "value" : 2163634.0
            }
          },
          "time_offset_split" : {
            "buckets" : {
              "-1y" : {
                "doc_count" : 420,
                "year" : {
                  "buckets" : [
                    {
                      "key_as_string" : "2018",
                      "doc_count" : 81,
                      "revenue" : {
                        "value" : 505124.0
                      }
                    },
                    {
                      "key_as_string" : "2019",
                      "doc_count" : 65,
                      "revenue" : {
                        "value" : 363058.0
                      }
                    }
                  ]
                }
              },
              "regular" : {
                "doc_count" : 418,
                "year" : {
                  "buckets" : [
                    {
                      "key_as_string" : "2019",
                      "doc_count" : 65,
                      "revenue" : {
                        "value" : 363058.0
                      }
                    },
                    {
                      "key_as_string" : "2020",
                      "doc_count" : 84,
                      "revenue" : {
                        "value" : 392924.0
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          "key" : "Product B",
          "doc_count" : 248,
          "first_year" : {
            "doc_count" : 215,
            "overall_revenue" : {
              "value" : 1315547.0
            }
          },
          "time_offset_split" : {
            "buckets" : {
              "-1y" : {
                "doc_count" : 211,
                "year" : {
                  "buckets" : [
                    {
                      "key_as_string" : "2018",
                      "key" : 1618963200000,
                      "doc_count" : 28,
                      "revenue" : {
                        "value" : 156543.0
                      }
                    },
   // ...
 * ```
 *
 * Example output:
 * ```
 * "aggregations" : {
    "product" : {
      "buckets" : [
        {
          "key" : "Product A",
          "doc_count" : 512,
          "first_year" : {
            "doc_count" : 418,
            "overall_revenue" : {
              "value" : 2163634.0
            }
          },
          "year" : {
            "buckets" : [
              {
                "key_as_string" : "2019",
                "doc_count" : 81,
                "revenue_regular" : {
                  "value" : 505124.0
                },
                "revenue_-1y" : {
                  "value" : 302736.0
                }
             },
             {
               "key_as_string" : "2020",
               "doc_count" : 78,
               "revenue_regular" : {
                 "value" : 392924.0
               },
               "revenue_-1y" : {
                 "value" : 363058.0
               },
             }
   // ...
 * ```
 *
 *
 * @param aggConfigs The agg configs instance
 * @param aggCursor The root aggregations object from the response which will be mutated in place
 */
export declare function mergeTimeShifts(aggConfigs: AggConfigs, aggCursor: Record<string, estypes.AggregationsAggregate>): void;
/**
 * Inserts a filters aggregation into the aggregation tree which splits buckets to fetch data for all time ranges
 * configured in metric aggregations.
 *
 * The current agg config can implement `splitForTimeShift` to force insertion of the time split filters aggregation
 * before the dsl of the agg config (date histogram and metrics aggregations do this)
 *
 * Example aggregation tree without time split:
 * ```
 * "aggs": {
    "product": {
      "terms": {
        "field": "product",
        "size": 3,
        "order": { "overall_revenue": "desc" }
      },
      "aggs": {
        "overall_revenue": {
          "sum": {
            "field": "sales"
          }
        },
        "year": {
          "date_histogram": {
            "field": "timestamp",
            "interval": "year"
          },
          "aggs": {
            "revenue": {
              "sum": {
                  "field": "sales"
              }
            }
          }
   // ...
 * ```
 *
 * Same aggregation tree with inserted time split:
 * ```
 * "aggs": {
    "product": {
      "terms": {
        "field": "product",
        "size": 3,
        "order": { "first_year>overall_revenue": "desc" }
      },
      "aggs": {
        "first_year": {
          "filter": {
            "range": {
              "timestamp": {
                "gte": "2019",
                "lte": "2020"
              }
            }
          },
          "aggs": {
            "overall_revenue": {
              "sum": {
                "field": "sales"
              }
            }
          }
        },
        "time_offset_split": {
          "filters": {
            "filters": {
              "regular": {
                "range": {
                  "timestamp": {
                    "gte": "2019",
                    "lte": "2020"
                  }
                }
              },
              "-1y": {
                "range": {
                  "timestamp": {
                    "gte": "2018",
                    "lte": "2019"
                  }
                }
              }
            }
          },
          "aggs": {
            "year": {
              "date_histogram": {
                "field": "timestamp",
                "interval": "year"
              },
              "aggs": {
                "revenue": {
                  "sum": {
                      "field": "sales"
                  }
                }
              }
            }
          }
        }
      }
 * ```
 */
export declare function insertTimeShiftSplit(aggConfigs: AggConfigs, config: AggConfig, timeShifts: Record<string, moment.Duration>, dslLvlCursor: Record<string, any>, defaultTimeZone: string): any;
