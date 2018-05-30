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

/* eslint max-len: 0 */
/* eslint quotes: 0 */

const staticSavedObjects = [
  {
    "id": "1ffc5e20-7827-11e7-8c47-65b845b5cfb3",
    "type": "visualization",
    "version": 1,
    "attributes": {
      "title": "Services [APM]",
      "visState": "{\"title\":\"Services [APM]\",\"type\":\"table\",\"params\":{\"perPage\":10,\"showPartialRows\":false,\"showMeticsAtAllLevels\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"showTotal\":false,\"totalFunc\":\"sum\"},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"transaction.duration.us\",\"customLabel\":\"Avg. Resp. Time\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"percentiles\",\"schema\":\"metric\",\"params\":{\"field\":\"transaction.duration.us\",\"percents\":[95],\"customLabel\":\"Resp. Time\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"cardinality\",\"schema\":\"metric\",\"params\":{\"field\":\"transaction.id\",\"customLabel\":\"Total Transactions\"}},{\"id\":\"6\",\"enabled\":true,\"type\":\"cardinality\",\"schema\":\"metric\",\"params\":{\"field\":\"error.id\",\"customLabel\":\"Errors\"}},{\"id\":\"5\",\"enabled\":true,\"type\":\"top_hits\",\"schema\":\"metric\",\"params\":{\"field\":\"view errors\",\"aggregate\":\"concat\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\",\"customLabel\":\"-\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"context.service.name\",\"size\":1000,\"order\":\"desc\",\"orderBy\":\"1\"}}]}",
      "uiStateJSON": "{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "1bdca740-7828-11e7-8c47-65b845b5cfb3",
    "type": "visualization",
    "version": 2,
    "attributes": {
      "title": "Top Services by Response Time [APM]",
      "visState": "{\"title\":\"Top Services by Response Time [APM]\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(0,156,224,1)\",\"split_mode\":\"terms\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"avg\",\"field\":\"transaction.duration.us\"}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"us,ms,0\",\"chart_type\":\"line\",\"line_width\":\"2\",\"point_size\":1,\"fill\":\"0\",\"stacked\":\"none\",\"terms_field\":\"context.service.name\",\"value_template\":\"{{value}} ms\",\"split_color_mode\":\"gradient\",\"terms_order_by\":\"61ca57f2-469d-11e7-af02-69e470af7417\"}],\"time_field\":\"@timestamp\",\"interval\":\">=1m\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"show_legend\":1,\"show_grid\":1},\"aggs\":[]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "804ffc40-7828-11e7-8c47-65b845b5cfb3",
    "type": "visualization",
    "version": 1,
    "attributes": {
      "title": "Top Services by Request Per Minute [APM]",
      "visState": "{\"title\":\"Top Apps by Request Per Minute [APM]\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(0,156,224,1)\",\"split_mode\":\"terms\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"count\"},{\"id\":\"3fcaa6c0-7828-11e7-bb25-2ff6dee07a1b\",\"type\":\"cumulative_sum\",\"field\":\"61ca57f2-469d-11e7-af02-69e470af7417\"},{\"unit\":\"1m\",\"id\":\"467f1cd0-7828-11e7-bb25-2ff6dee07a1b\",\"type\":\"derivative\",\"field\":\"3fcaa6c0-7828-11e7-bb25-2ff6dee07a1b\"},{\"unit\":\"\",\"id\":\"4bd1b8f0-7828-11e7-bb25-2ff6dee07a1b\",\"type\":\"positive_only\",\"field\":\"467f1cd0-7828-11e7-bb25-2ff6dee07a1b\"}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"line\",\"line_width\":\"2\",\"point_size\":1,\"fill\":\"0\",\"stacked\":\"none\",\"terms_field\":\"context.service.name\",\"terms_order_by\":\"_count\",\"value_template\":\"{{value}} rpm\"}],\"time_field\":\"@timestamp\",\"interval\":\">=1m\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"show_legend\":1,\"show_grid\":1},\"aggs\":[]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "8d3ed660-7828-11e7-8c47-65b845b5cfb3",
    "type": "dashboard",
    "version": 1,
    "attributes": {
      "title": "[APM] Services",
      "hits": 0,
      "description": "",
      "panelsJSON": "[{\"col\":1,\"id\":\"1ffc5e20-7827-11e7-8c47-65b845b5cfb3\",\"panelIndex\":1,\"row\":4,\"size_x\":12,\"size_y\":5,\"type\":\"visualization\"},{\"col\":1,\"id\":\"1bdca740-7828-11e7-8c47-65b845b5cfb3\",\"panelIndex\":2,\"row\":1,\"size_x\":6,\"size_y\":3,\"type\":\"visualization\"},{\"col\":7,\"id\":\"804ffc40-7828-11e7-8c47-65b845b5cfb3\",\"panelIndex\":3,\"row\":1,\"size_x\":6,\"size_y\":3,\"type\":\"visualization\"}]",
      "optionsJSON": "{\"darkTheme\":false}",
      "uiStateJSON": "{\"P-1\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}}}",
      "version": 1,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[],\"highlightAll\":true,\"version\":true}"
      }
    }
  },
  {
    "id": "c618e4e0-7c69-11e7-aa55-3b0d52c71c60",
    "type": "visualization",
    "version": 1,
    "attributes": {
      "title": "Error Occurrences [APM]",
      "visState": "{\"title\":\"Error Occurrences [APM]\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(0,156,224,1)\",\"split_mode\":\"terms\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"count\"}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"bar\",\"line_width\":\"0\",\"point_size\":1,\"fill\":\"1\",\"stacked\":\"none\",\"label\":\"Occurrences\",\"terms_field\":\"error.grouping_key\"}],\"time_field\":\"@timestamp\",\"interval\":\">=1m\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"show_legend\":0,\"show_grid\":1,\"filter\":\"processor.event:error\"},\"aggs\":[]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "ceefd050-7c6a-11e7-aa55-3b0d52c71c60",
    "type": "search",
    "version": 1,
    "attributes": {
      "title": "Error Details [APM]",
      "description": "",
      "hits": 0,
      "columns": [
        "error.culprit",
        "error.exception.type",
        "error.exception.message",
        "error.log.message",
        "error.exception.handled",
        "context.service.name"
      ],
      "sort": [
        "@timestamp",
        "desc"
      ],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"highlightAll\":true,\"version\":true,\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[{\"$state\":{\"store\":\"appState\"},\"meta\":{\"alias\":null,\"disabled\":false,\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"key\":\"processor.event\",\"negate\":false,\"params\":{\"query\":\"error\",\"type\":\"phrase\"},\"type\":\"phrase\",\"value\":\"error\"},\"query\":{\"match\":{\"processor.event\":{\"query\":\"error\",\"type\":\"phrase\"}}}}]}"
      }
    }
  },
  {
    "id": "5f08a870-7c6a-11e7-aa55-3b0d52c71c60",
    "type": "dashboard",
    "version": 1,
    "attributes": {
      "title": "[APM] Error Details",
      "hits": 0,
      "description": "",
      "panelsJSON": "[{\"col\":1,\"id\":\"c618e4e0-7c69-11e7-aa55-3b0d52c71c60\",\"panelIndex\":1,\"row\":1,\"size_x\":12,\"size_y\":3,\"type\":\"visualization\"},{\"col\":1,\"columns\":[\"error.culprit\",\"error.exception.type\",\"error.exception.message\",\"error.log.message\",\"error.exception.handled\",\"context.service.name\"],\"id\":\"ceefd050-7c6a-11e7-aa55-3b0d52c71c60\",\"panelIndex\":2,\"row\":4,\"size_x\":12,\"size_y\":21,\"sort\":[\"@timestamp\",\"desc\"],\"type\":\"search\"}]",
      "optionsJSON": "{\"darkTheme\":false}",
      "uiStateJSON": "{}",
      "version": 1,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[],\"highlightAll\":true,\"version\":true}"
      }
    }
  },
  {
    "id": "22518e70-7c69-11e7-aa55-3b0d52c71c60",
    "type": "visualization",
    "version": 1,
    "attributes": {
      "title": "Top Errors for Time Period [APM]",
      "visState": "{\"title\":\"Top Errors for Time Period [APM]\",\"type\":\"table\",\"params\":{\"perPage\":25,\"showMeticsAtAllLevels\":false,\"showPartialRows\":false,\"showTotal\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"totalFunc\":\"sum\"},\"aggs\":[{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"bucket\",\"params\":{\"field\":\"error id icon\",\"size\":100,\"order\":\"desc\",\"orderBy\":\"1\",\"customLabel\":\"-\"}},{\"id\":\"5\",\"enabled\":true,\"type\":\"top_hits\",\"schema\":\"metric\",\"params\":{\"field\":\"error.exception.message\",\"aggregate\":\"concat\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\",\"customLabel\":\"Message\"}},{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Number of Errors\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"top_hits\",\"schema\":\"metric\",\"params\":{\"field\":\"error.exception.type\",\"aggregate\":\"concat\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\",\"customLabel\":\"Type\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"top_hits\",\"schema\":\"metric\",\"params\":{\"field\":\"error.culprit\",\"aggregate\":\"concat\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\",\"customLabel\":\"Culprit\"}},{\"id\":\"6\",\"enabled\":true,\"type\":\"top_hits\",\"schema\":\"metric\",\"params\":{\"field\":\"context.service.name\",\"aggregate\":\"concat\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\",\"customLabel\":\"App Name\"}},{\"id\":\"7\",\"enabled\":true,\"type\":\"top_hits\",\"schema\":\"metric\",\"params\":{\"field\":\"error.grouping_key\",\"aggregate\":\"concat\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\",\"customLabel\":\"-\"}}]}",
      "uiStateJSON": "{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"filter\":[],\"query\":{\"language\":\"lucene\",\"query\":\"\"}}"
      }
    }
  },
  {
    "id": "37f6fac0-7c6a-11e7-aa55-3b0d52c71c60",
    "type": "dashboard",
    "version": 1,
    "attributes": {
      "title": "[APM] Errors",
      "hits": 0,
      "description": "",
      "panelsJSON": "[{\"col\":1,\"id\":\"22518e70-7c69-11e7-aa55-3b0d52c71c60\",\"panelIndex\":1,\"row\":4,\"size_x\":12,\"size_y\":10,\"type\":\"visualization\"},{\"col\":1,\"id\":\"c618e4e0-7c69-11e7-aa55-3b0d52c71c60\",\"panelIndex\":2,\"row\":1,\"size_x\":12,\"size_y\":3,\"type\":\"visualization\"}]",
      "optionsJSON": "{\"darkTheme\":false}",
      "uiStateJSON": "{\"P-1\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}}}",
      "version": 1,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[],\"highlightAll\":true,\"version\":true}"
      }
    }
  },
  {
    "id": "a2e199b0-7820-11e7-8c47-65b845b5cfb3",
    "type": "visualization",
    "version": 1,
    "attributes": {
      "title": "Top Transactions for Time Period [APM]",
      "visState": "{\"aggs\":[{\"enabled\":true,\"id\":\"2\",\"params\":{\"customLabel\":\"Transaction\",\"field\":\"transaction.name.keyword\",\"order\":\"desc\",\"orderBy\":\"1\",\"size\":1000},\"schema\":\"bucket\",\"type\":\"terms\"},{\"enabled\":true,\"id\":\"5\",\"params\":{\"aggregate\":\"concat\",\"customLabel\":\"Type\",\"field\":\"transaction.type\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\"},\"schema\":\"metric\",\"type\":\"top_hits\"},{\"enabled\":true,\"id\":\"1\",\"params\":{\"customLabel\":\"Avg. Resp Time (ms)\",\"field\":\"transaction.duration.us\"},\"schema\":\"metric\",\"type\":\"avg\"},{\"enabled\":true,\"id\":\"3\",\"params\":{\"customLabel\":\"Resp Time (ms)\",\"field\":\"transaction.duration.us\",\"percents\":[95]},\"schema\":\"metric\",\"type\":\"percentiles\"},{\"enabled\":true,\"id\":\"4\",\"params\":{\"aggregate\":\"concat\",\"customLabel\":\"View Spans\",\"field\":\"transaction.id\",\"size\":1,\"sortField\":\"@timestamp\",\"sortOrder\":\"desc\"},\"schema\":\"metric\",\"type\":\"top_hits\"}],\"params\":{\"perPage\":25,\"showMeticsAtAllLevels\":false,\"showPartialRows\":false,\"showTotal\":false,\"sort\":{\"columnIndex\":null,\"direction\":null},\"totalFunc\":\"sum\"},\"title\":\"Top Transactions for Time Period [APM]\",\"type\":\"table\"}",
      "uiStateJSON": "{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"filter\":[],\"query\":{\"language\":\"lucene\",\"query\":\"\"}}"
      }
    }
  },
  {
    "id": "09bcf890-7822-11e7-8c47-65b845b5cfb3",
    "type": "visualization",
    "version": 2,
    "attributes": {
      "title": "Response Times [APM]",
      "visState": "{\"title\":\"Response Times [APM]\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(0,156,224,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"avg\",\"field\":\"transaction.duration.us\"}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"us,ms,0\",\"chart_type\":\"line\",\"line_width\":\"2\",\"point_size\":1,\"fill\":\"0\",\"stacked\":\"none\",\"value_template\":\"{{value}} ms\",\"label\":\"Average\"},{\"id\":\"79921480-7821-11e7-8745-07eaffcb65e5\",\"color\":\"rgba(115,216,255,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"79921481-7821-11e7-8745-07eaffcb65e5\",\"type\":\"percentile\",\"field\":\"transaction.duration.us\",\"percentiles\":[{\"value\":\"95\",\"percentile\":\"\",\"shade\":0.2,\"id\":\"858ec670-7821-11e7-8745-07eaffcb65e5\",\"mode\":\"line\"}]}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"us,ms,0\",\"chart_type\":\"line\",\"line_width\":1,\"point_size\":1,\"fill\":0.5,\"stacked\":\"none\",\"value_template\":\"{{value}} ms\",\"label\":\"95th Percentile\"},{\"id\":\"c1e42de0-7821-11e7-8745-07eaffcb65e5\",\"color\":\"rgba(254,146,0,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"c1e42de1-7821-11e7-8745-07eaffcb65e5\",\"type\":\"percentile\",\"field\":\"transaction.duration.us\",\"percentiles\":[{\"value\":\"99\",\"percentile\":\"\",\"shade\":0.2,\"id\":\"858ec670-7821-11e7-8745-07eaffcb65e5\",\"mode\":\"line\"}]}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"us,ms,0\",\"chart_type\":\"line\",\"line_width\":\"2\",\"point_size\":1,\"fill\":\"0\",\"stacked\":\"none\",\"value_template\":\"{{value}} ms\",\"label\":\"99th Percentile\"}],\"time_field\":\"@timestamp\",\"interval\":\">=1m\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"show_legend\":1,\"show_grid\":1,\"legend_position\":\"right\"},\"aggs\":[]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"query\":{\"language\":\"lucene\",\"query\":\"\"}}"
      }
    }
  },
  {
    "id": "55606a60-7823-11e7-8c47-65b845b5cfb3",
    "type": "visualization",
    "version": 1,
    "attributes": {
      "title": "Request Per Minute [APM]",
      "visState": "{\"title\":\"Request Per Minute [APM]\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(115,216,255,1)\",\"split_mode\":\"terms\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"count\"},{\"id\":\"3fcaa6c0-7828-11e7-bb25-2ff6dee07a1b\",\"type\":\"cumulative_sum\",\"field\":\"61ca57f2-469d-11e7-af02-69e470af7417\"},{\"unit\":\"1m\",\"id\":\"467f1cd0-7828-11e7-bb25-2ff6dee07a1b\",\"type\":\"derivative\",\"field\":\"3fcaa6c0-7828-11e7-bb25-2ff6dee07a1b\"},{\"unit\":\"\",\"id\":\"4bd1b8f0-7828-11e7-bb25-2ff6dee07a1b\",\"type\":\"positive_only\",\"field\":\"467f1cd0-7828-11e7-bb25-2ff6dee07a1b\"}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"line\",\"line_width\":\"2\",\"point_size\":\"0\",\"fill\":\"0\",\"stacked\":\"none\",\"label\":\"\",\"value_template\":\"{{value}} rpm\",\"terms_field\":\"transaction.result\"}],\"time_field\":\"@timestamp\",\"interval\":\">=1m\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"show_legend\":1,\"show_grid\":1},\"aggs\":[]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"query\":{\"language\":\"lucene\",\"query\":\"\"}}"
      }
    }
  },
  {
    "id": "41b5d920-7821-11e7-8c47-65b845b5cfb3",
    "type": "dashboard",
    "version": 1,
    "attributes": {
      "title": "[APM] Transactions",
      "hits": 0,
      "description": "",
      "panelsJSON": "[{\"col\":1,\"id\":\"a2e199b0-7820-11e7-8c47-65b845b5cfb3\",\"panelIndex\":1,\"row\":4,\"size_x\":12,\"size_y\":10,\"type\":\"visualization\"},{\"col\":1,\"id\":\"09bcf890-7822-11e7-8c47-65b845b5cfb3\",\"panelIndex\":2,\"row\":1,\"size_x\":6,\"size_y\":3,\"type\":\"visualization\"},{\"col\":7,\"id\":\"55606a60-7823-11e7-8c47-65b845b5cfb3\",\"panelIndex\":3,\"row\":1,\"size_x\":6,\"size_y\":3,\"type\":\"visualization\"}]",
      "optionsJSON": "{\"darkTheme\":false}",
      "uiStateJSON": "{\"P-1\":{\"vis\":{\"params\":{\"sort\":{\"columnIndex\":null,\"direction\":null}}}}}",
      "version": 1,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[],\"highlightAll\":true,\"version\":true}"
      }
    }
  },
  {
    "id": "d7735b90-7ddf-11e7-b115-df9c90da2df1",
    "type": "search",
    "version": 1,
    "attributes": {
      "title": "Spans [APM]",
      "description": "",
      "hits": 0,
      "columns": [
        "span.type",
        "span.name",
        "span.duration.us",
        "span.start.us"
      ],
      "sort": [
        "span.start.us",
        "asc"
      ],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"highlightAll\":true,\"version\":true,\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[{\"meta\":{\"index\":\"12e52550-6354-11e8-9d01-ed6a4badd083\",\"negate\":false,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"processor.event\",\"value\":\"span\",\"params\":{\"query\":\"span\",\"type\":\"phrase\"}},\"query\":{\"match\":{\"processor.event\":{\"query\":\"span\",\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}]}"
      }
    }
  },
  {
    "id": "3e3de700-7de0-11e7-b115-df9c90da2df1",
    "type": "dashboard",
    "version": 2,
    "attributes": {
      "title": "[APM] Span Details",
      "hits": 0,
      "description": "",
      "panelsJSON": "[{\"size_x\":12,\"size_y\":23,\"panelIndex\":1,\"type\":\"search\",\"id\":\"d7735b90-7ddf-11e7-b115-df9c90da2df1\",\"col\":1,\"row\":1,\"columns\":[\"span.type\",\"span.name\",\"span.duration.us\",\"span.start.us\"],\"sort\":[\"span.start.us\",\"asc\"]}]",
      "optionsJSON": "{\"darkTheme\":false}",
      "uiStateJSON": "{}",
      "version": 1,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[],\"highlightAll\":true,\"version\":true}"
      }
    }
  }
];

function getIndexPatternSavedObject(server) {
  let apmIndexPattern = 'apm*';
  try {
    apmIndexPattern = server.config().get('xpack.apm.indexPattern');
  } catch (error) {
    // ignore error when config does not contain 'xpack.apm.indexPattern'.
    // This is expected when APM plugin is not running.
  }

  return {
    "id": "12e52550-6354-11e8-9d01-ed6a4badd083",
    "type": "index-pattern",
    "version": 0,
    "attributes": {
      "title": apmIndexPattern,
      "timeFieldName": "@timestamp",
      "fields": "[{\"name\":\"@timestamp\",\"type\":\"date\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_index\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_score\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_source\",\"type\":\"_source\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"beat.hostname\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"beat.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"beat.timezone\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"beat.version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.process.pid\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.process.title\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.http_version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.method\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.full\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.hash\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.hostname\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.pathname\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.port\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.protocol\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.raw\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.request.url.search\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.response.finished\",\"type\":\"boolean\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.response.status_code\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.agent.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.agent.version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.environment\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.framework.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.framework.version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.language.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.language.version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.runtime.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.runtime.version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.service.version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.system.architecture\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.system.hostname\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.system.platform\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.tags.foo\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.tags.lorem\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.tags.multi-line\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.tags.this-is-a-very-long-tag-name-without-any-spaces\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.user.email\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.user.id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"context.user.username\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"docker.container.id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"docker.container.image\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"docker.container.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error id icon\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.code\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.culprit\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"error.exception.code\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.exception.handled\",\"type\":\"boolean\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.exception.message\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"error.exception.module\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.exception.type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.grouping_key\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.log.level\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.log.logger_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.log.message\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"error.log.param_message\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"error.message\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"error.type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"kubernetes.container.image\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"kubernetes.container.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"kubernetes.namespace\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"kubernetes.node.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"kubernetes.pod.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"listening\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"meta.cloud.availability_zone\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"meta.cloud.instance_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"meta.cloud.instance_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"meta.cloud.machine_type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"meta.cloud.project_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"meta.cloud.provider\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"meta.cloud.region\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"processor.event\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"processor.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"sourcemap.bundle_filepath\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"sourcemap.service.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"sourcemap.service.version\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"span.duration.us\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"span.id\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"span.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"span.parent\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"span.start.us\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"span.type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"tags\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"transaction.duration.us\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"transaction.id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"transaction.name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"transaction.name.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"transaction.result\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"transaction.sampled\",\"type\":\"boolean\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"transaction.span_count.dropped.total\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"transaction.type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"view errors\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"view spans\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true}]"
    }
  };
}

export function getSavedObjects(server) {
  return [getIndexPatternSavedObject(server), ...staticSavedObjects];
}
