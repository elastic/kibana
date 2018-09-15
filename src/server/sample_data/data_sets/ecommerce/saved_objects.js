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

export const savedObjects = [
  {
<<<<<<< HEAD
    "id": "37cc8650-b882-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Sales by Category",
      "visState": "{\"title\":\"[eCommerce] Sales by Category\",\"type\":\"area\",\"params\":{\"type\":\"area\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Sum of total_quantity\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"area\",\"mode\":\"stacked\",\"data\":{\"label\":\"Sum of total_quantity\",\"id\":\"1\"},\"drawLinesBetweenPoints\":true,\"showCircles\":true,\"interpolate\":\"linear\",\"valueAxis\":\"ValueAxis-1\"}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"top\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"total_quantity\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"order_date\",\"interval\":\"auto\",\"time_zone\":\"America/New_York\",\"drop_partials\":false,\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"category.keyword\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
=======
    "id": "aeb212e0-4c84-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Controls",
      "visState": "{\"title\":\"[Flights] Controls\",\"type\":\"input_control_vis\",\"params\":{\"controls\":[{\"id\":\"1525098134264\",\"indexPattern\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"fieldName\":\"OriginCityName\",\"parent\":\"\",\"label\":\"Origin City\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"size\":100,\"order\":\"desc\"}},{\"id\":\"1525099277699\",\"indexPattern\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"fieldName\":\"DestCityName\",\"parent\":\"1525098134264\",\"label\":\"Destination City\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"size\":100,\"order\":\"desc\"}},{\"id\":\"1525099307278\",\"indexPattern\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"fieldName\":\"AvgTicketPrice\",\"parent\":\"\",\"label\":\"Average Ticket Price\",\"type\":\"range\",\"options\":{\"decimalPlaces\":0,\"step\":10}}],\"updateFiltersOnChange\":false,\"useTimeFilter\":true,\"pinFilters\":false},\"aggs\":[]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "ed8436b0-b88b-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Sales by Gender",
      "visState": "{\"title\":\"[eCommerce] Sales by Gender\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":true,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"customer_gender\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
=======
    "id": "c8fc3d30-4c87-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Flight Count and Average Ticket Price",
      "visState": "{\"title\":\"[Flights] Flight Count and Average Ticket Price\",\"type\":\"area\",\"params\":{\"type\":\"area\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Average Ticket Price\"}},{\"id\":\"ValueAxis-2\",\"name\":\"RightAxis-1\",\"type\":\"value\",\"position\":\"right\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Flight Count\"}}],\"seriesParams\":[{\"show\":true,\"mode\":\"stacked\",\"type\":\"area\",\"drawLinesBetweenPoints\":true,\"showCircles\":false,\"interpolate\":\"linear\",\"lineWidth\":2,\"data\":{\"id\":\"5\",\"label\":\"Flight Count\"},\"valueAxis\":\"ValueAxis-2\"},{\"show\":true,\"mode\":\"stacked\",\"type\":\"line\",\"drawLinesBetweenPoints\":false,\"showCircles\":true,\"interpolate\":\"linear\",\"data\":{\"id\":\"4\",\"label\":\"Average Ticket Price\"},\"valueAxis\":\"ValueAxis-1\",\"lineWidth\":2}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false,\"radiusRatio\":13},\"aggs\":[{\"id\":\"3\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"5\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Flight Count\"}},{\"id\":\"4\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"AvgTicketPrice\",\"customLabel\":\"Average Ticket Price\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"radius\",\"params\":{\"field\":\"AvgTicketPrice\"}}]}",
      "uiStateJSON": "{\"vis\":{\"legendOpen\":true,\"colors\":{\"Average Ticket Price\":\"#629E51\",\"Flight Count\":\"#AEA2E0\"}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "571aaf70-4c88-11e8-b3d7-01146121b73d",
    "type": "search",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Flight Log",
      "description": "",
      "hits": 0,
      "columns": [
        "Carrier",
        "OriginCityName",
        "OriginCountry",
        "DestCityName",
        "DestCountry",
        "FlightTimeMin",
        "AvgTicketPrice",
        "Cancelled",
        "FlightDelayType"
      ],
      "sort": [
        "timestamp",
        "desc"
      ],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"highlightAll\":true,\"version\":true,\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[]}"
      }
    }
  },
  {
    "id": "8f4d0c00-4c86-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Airline Carrier",
      "visState": "{\"title\":\"[Flights] Airline Carrier\",\"type\":\"pie\",\"params\":{\"type\":\"pie\",\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"isDonut\":true,\"labels\":{\"show\":true,\"values\":true,\"last_level\":true,\"truncate\":100}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"Carrier\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
      "uiStateJSON": "{\"vis\":{\"legendOpen\":false}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "f8290060-4c88-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Delay Type",
      "visState": "{\"title\":\"[Flights] Delay Type\",\"type\":\"area\",\"params\":{\"type\":\"area\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"drawLinesBetweenPoints\":true,\"showCircles\":true,\"interpolate\":\"cardinal\",\"valueAxis\":\"ValueAxis-1\"}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"FlightDelayType\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "bcb63b50-4c89-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Delays & Cancellations",
      "visState": "{\"title\":\"[Flights] Delays & Cancellations\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(0,156,224,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"filter_ratio\",\"numerator\":\"FlightDelay:true\"}],\"separate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"percent\",\"chart_type\":\"line\",\"line_width\":\"2\",\"point_size\":\"0\",\"fill\":0.5,\"stacked\":\"none\",\"label\":\"Percent Delays\"}],\"time_field\":\"timestamp\",\"index_pattern\":\"kibana_sample_data_flights\",\"interval\":\">=1h\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"show_legend\":1,\"show_grid\":1,\"annotations\":[{\"fields\":\"FlightDelay,Cancelled,Carrier\",\"template\":\"{{Carrier}}: Flight Delayed and Cancelled!\",\"index_pattern\":\"kibana_sample_data_flights\",\"query_string\":\"FlightDelay:true AND Cancelled:true\",\"id\":\"53b7dff0-4c89-11e8-a66a-6989ad5a0a39\",\"color\":\"rgba(0,98,177,1)\",\"time_field\":\"timestamp\",\"icon\":\"fa-exclamation-triangle\",\"ignore_global_filters\":1,\"ignore_panel_filters\":1}],\"legend_position\":\"bottom\"},\"aggs\":[]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{}"
      }
    }
  },
  {
    "id": "9886b410-4c8b-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Delay Buckets",
      "visState": "{\"title\":\"[Flights] Delay Buckets\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"FlightDelayMin\",\"interval\":30,\"extended_bounds\":{},\"customLabel\":\"Flight Delay Minutes\"}}]}",
      "uiStateJSON": "{\"vis\":{\"legendOpen\":false}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[{\"meta\":{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"negate\":true,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"FlightDelayMin\",\"value\":\"0\",\"params\":{\"query\":0,\"type\":\"phrase\"}},\"query\":{\"match\":{\"FlightDelayMin\":{\"query\":0,\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "09ffee60-b88c-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Markdown",
      "visState": "{\"title\":\"[eCommerce] Markdown\",\"type\":\"markdown\",\"params\":{\"fontSize\":12,\"openLinksInNewTab\":false,\"markdown\":\"### Sample eCommerce Data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html).\"},\"aggs\":[]}",
=======
    "id": "76e3c090-4c8c-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Flight Delays",
      "visState": "{\"title\":\"[Flights] Flight Delays\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"BottomAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"FlightDelay\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Flight Delays\"}}]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "1c389590-b88d-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Controls",
      "visState": "{\"title\":\"[eCommerce] Controls\",\"type\":\"input_control_vis\",\"params\":{\"controls\":[{\"id\":\"1536977437774\",\"indexPattern\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"fieldName\":\"manufacturer.keyword\",\"parent\":\"\",\"label\":\"Manufacturer\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"dynamicOptions\":true,\"size\":5,\"order\":\"desc\"}},{\"id\":\"1536977465554\",\"indexPattern\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"fieldName\":\"category.keyword\",\"parent\":\"\",\"label\":\"Category\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"dynamicOptions\":true,\"size\":5,\"order\":\"desc\"}},{\"id\":\"1536977596163\",\"indexPattern\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"fieldName\":\"total_quantity\",\"parent\":\"\",\"label\":\"Quantity\",\"type\":\"range\",\"options\":{\"decimalPlaces\":0,\"step\":1}}],\"updateFiltersOnChange\":false,\"useTimeFilter\":true,\"pinFilters\":false},\"aggs\":[]}",
=======
    "id": "707665a0-4c8c-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Flight Cancellations",
      "visState": "{\"title\":\"[Flights] Flight Cancellations\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"BottomAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"Cancelled\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Flight Cancellations\"}}]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "45e07720-b890-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:16:18.181Z",
    "version": 2,
    "attributes": {
      "title": "[eCommerce] Promotion Tracking",
      "visState": "{\"title\":\"[eCommerce] Promotion Tracking\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(23,233,230,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"sum\",\"field\":\"taxful_total_price\"}],\"separate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"line\",\"line_width\":1,\"point_size\":1,\"fill\":0.5,\"stacked\":\"none\",\"filter\":\"products.product_name:*bag*\",\"label\":\"Revenue Bags\",\"value_template\":\"${{value}}\"},{\"id\":\"ea20ae70-b88d-11e8-a451-f37365e9f268\",\"color\":\"rgba(240,138,217,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"ea20ae71-b88d-11e8-a451-f37365e9f268\",\"type\":\"sum\",\"field\":\"taxful_total_price\"}],\"separate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"line\",\"line_width\":1,\"point_size\":1,\"fill\":0.5,\"stacked\":\"none\",\"filter\":\"products.product_name:*trouster*\",\"label\":\"Revenue Trousers\",\"value_template\":\"${{value}}\"},{\"id\":\"faa2c170-b88d-11e8-a451-f37365e9f268\",\"color\":\"rgba(235,186,180,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"faa2c171-b88d-11e8-a451-f37365e9f268\",\"type\":\"sum\",\"field\":\"taxful_total_price\"}],\"separate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"line\",\"line_width\":1,\"point_size\":1,\"fill\":0.5,\"stacked\":\"none\",\"filter\":\"products.product_name:*cocktail dress*\",\"label\":\"Revenue Cocktail Dresses\",\"value_template\":\"${{value}}\"},{\"id\":\"062d77b0-b88e-11e8-a451-f37365e9f268\",\"color\":\"rgba(191,240,129,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"062d77b1-b88e-11e8-a451-f37365e9f268\",\"type\":\"sum\",\"field\":\"taxful_total_price\"}],\"separate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"line\",\"line_width\":1,\"point_size\":1,\"fill\":0.5,\"stacked\":\"none\",\"filter\":\"products.product_name:*watch*\",\"label\":\"Revenue Watches\",\"value_template\":\"${{value}}\"}],\"time_field\":\"order_date\",\"index_pattern\":\"kibana_sample_data_ecommerce\",\"interval\":\">=12h\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"axis_scale\":\"normal\",\"show_legend\":1,\"show_grid\":1,\"legend_position\":\"bottom\",\"annotations\":[{\"fields\":\"taxful_total_price\",\"template\":\"Ring the bell! ${{taxful_total_price}}\",\"index_pattern\":\"kibana_sample_data_ecommerce\",\"query_string\":\"taxful_total_price:>250\",\"id\":\"c8c30be0-b88f-11e8-a451-f37365e9f268\",\"color\":\"rgba(25,77,51,1)\",\"time_field\":\"order_date\",\"icon\":\"fa-bell\",\"ignore_global_filters\":1,\"ignore_panel_filters\":1}]},\"aggs\":[]}",
=======
    "id": "79e8ff60-4c8e-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Destination Airport",
      "visState": "{\"title\":\"[Flights] Destination Airport\",\"type\":\"tile_map\",\"params\":{\"colorSchema\":\"Yellow to Red\",\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"addTooltip\":true,\"heatClusterSize\":1.5,\"legendPosition\":\"bottomright\",\"mapZoom\":2,\"mapCenter\":[0,0],\"wms\":{\"enabled\":false,\"options\":{\"format\":\"image/png\",\"transparent\":true},\"baseLayersAreLoaded\":{},\"tmsLayers\":[{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}],\"selectedTmsLayer\":{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"DestLocation\",\"autoPrecision\":true,\"isFilteredByCollar\":true,\"useGeocentroid\":true,\"precision\":2}}]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "10f1a240-b891-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Total Revenue",
      "visState": "{\"title\":\"[eCommerce] Total Revenue\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":10000}],\"labels\":{\"show\":false},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"\",\"fontSize\":36}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"sum\",\"schema\":\"metric\",\"params\":{\"field\":\"taxful_total_price\",\"customLabel\":\"Total Revenue\"}}]}",
=======
    "id": "293b5a30-4c8f-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Destination Weather",
      "visState": "{\"title\":\"[Flights] Destination Weather\",\"type\":\"tagcloud\",\"params\":{\"scale\":\"linear\",\"orientation\":\"single\",\"minFontSize\":18,\"maxFontSize\":72,\"showLabel\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"DestWeather\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "b80e6540-b891-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Sold Products per Day",
      "visState": "{\"title\":\"[eCommerce] Sold Products per Day\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"gauge\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"#68BC00\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"count\"}],\"separate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"number\",\"chart_type\":\"line\",\"line_width\":1,\"point_size\":1,\"fill\":0.5,\"stacked\":\"none\",\"label\":\"Trxns / day\"}],\"time_field\":\"order_date\",\"index_pattern\":\"kibana_sample_data_ecommerce\",\"interval\":\"1d\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"axis_scale\":\"normal\",\"show_legend\":1,\"show_grid\":1,\"gauge_color_rules\":[{\"value\":150,\"id\":\"6da070c0-b891-11e8-b645-195edeb9de84\",\"gauge\":\"rgba(104,188,0,1)\",\"operator\":\"gte\"},{\"value\":150,\"id\":\"9b0cdbc0-b891-11e8-b645-195edeb9de84\",\"gauge\":\"rgba(244,78,59,1)\",\"operator\":\"lt\"}],\"gauge_width\":\"15\",\"gauge_inner_width\":10,\"gauge_style\":\"half\",\"filter\":\"\",\"gauge_max\":\"300\"},\"aggs\":[]}",
=======
    "id": "129be430-4c93-11e8-b3d7-01146121b73d",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Markdown Instructions",
      "visState": "{\"title\":\"[Flights] Markdown Instructions\",\"type\":\"markdown\",\"params\":{\"fontSize\":10,\"openLinksInNewTab\":true,\"markdown\":\"### Sample Flight data\\nThis dashboard contains sample data for you to play with. You can view it, search it, and interact with the visualizations. For more information about Kibana, check our [docs](https://www.elastic.co/guide/en/kibana/current/index.html).\"},\"aggs\":[]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "4b3ec120-b892-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Average Sales Price",
      "visState": "{\"title\":\"[eCommerce] Average Sales Price\",\"type\":\"gauge\",\"params\":{\"type\":\"gauge\",\"addTooltip\":true,\"addLegend\":true,\"isDisplayWarning\":false,\"gauge\":{\"verticalSplit\":false,\"extendRange\":true,\"percentageMode\":false,\"gaugeType\":\"Circle\",\"gaugeStyle\":\"Full\",\"backStyle\":\"Full\",\"orientation\":\"vertical\",\"colorSchema\":\"Green to Red\",\"gaugeColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":50},{\"from\":50,\"to\":75},{\"from\":75,\"to\":100}],\"invertColors\":true,\"labels\":{\"show\":true,\"color\":\"black\"},\"scale\":{\"show\":false,\"labels\":false,\"color\":\"#333\"},\"type\":\"meter\",\"style\":{\"bgWidth\":0.9,\"width\":0.9,\"mask\":false,\"bgMask\":false,\"maskBars\":50,\"bgFill\":\"#eee\",\"bgColor\":false,\"subText\":\"per order\",\"fontSize\":60,\"labelColor\":true},\"minAngle\":0,\"maxAngle\":6.283185307179586}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"taxful_total_price\",\"customLabel\":\"average spend\"}}]}",
      "uiStateJSON": "{\"vis\":{\"defaultColors\":{\"0 - 50\":\"rgb(165,0,38)\",\"50 - 75\":\"rgb(255,255,190)\",\"75 - 100\":\"rgb(0,104,55)\"}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
    "id": "334084f0-52fd-11e8-a160-89cc2ad9e8e2",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Origin Country Ticket Prices",
      "visState": "{\"title\":\"[Flights] Origin Country Ticket Prices\",\"type\":\"region_map\",\"params\":{\"legendPosition\":\"bottomright\",\"addTooltip\":true,\"colorSchema\":\"Blues\",\"selectedLayer\":{\"attribution\":\"<p><a href=\\\"http://www.naturalearthdata.com/about/terms-of-use\\\">Made with NaturalEarth</a> | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"name\":\"World Countries\",\"weight\":1,\"format\":{\"type\":\"geojson\"},\"url\":\"https://vector.maps.elastic.co/blob/5659313586569216?elastic_tile_service_tos=agree&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"fields\":[{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},{\"name\":\"name\",\"description\":\"Country name\"},{\"name\":\"iso3\",\"description\":\"Three letter abbreviation\"}],\"created_at\":\"2017-04-26T17:12:15.978370\",\"tags\":[],\"id\":5659313586569216,\"layerId\":\"elastic_maps_service.World Countries\"},\"selectedJoinField\":{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},\"isDisplayWarning\":false,\"wms\":{\"enabled\":false,\"options\":{\"format\":\"image/png\",\"transparent\":true},\"baseLayersAreLoaded\":{},\"tmsLayers\":[{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}],\"selectedTmsLayer\":{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=6.3.0&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}},\"mapZoom\":2,\"mapCenter\":[0,0],\"outlineWeight\":1,\"showAllShapes\":true},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"AvgTicketPrice\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"OriginCountry\",\"size\":100,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "9ca7aa90-b892-11e8-a6d9-e546fe2bba5f",
    "type": "visualization",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Average Sold Quantity",
      "visState": "{\"title\":\"[eCommerce] Average Sold Quantity\",\"type\":\"gauge\",\"params\":{\"type\":\"gauge\",\"addTooltip\":true,\"addLegend\":true,\"isDisplayWarning\":false,\"gauge\":{\"verticalSplit\":false,\"extendRange\":true,\"percentageMode\":false,\"gaugeType\":\"Circle\",\"gaugeStyle\":\"Full\",\"backStyle\":\"Full\",\"orientation\":\"vertical\",\"colorSchema\":\"Green to Red\",\"gaugeColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":2},{\"from\":2,\"to\":3},{\"from\":3,\"to\":4}],\"invertColors\":true,\"labels\":{\"show\":true,\"color\":\"black\"},\"scale\":{\"show\":false,\"labels\":false,\"color\":\"#333\"},\"type\":\"meter\",\"style\":{\"bgWidth\":0.9,\"width\":0.9,\"mask\":false,\"bgMask\":false,\"maskBars\":50,\"bgFill\":\"#eee\",\"bgColor\":false,\"subText\":\"per order\",\"fontSize\":60,\"labelColor\":true},\"minAngle\":0,\"maxAngle\":6.283185307179586}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"total_quantity\",\"customLabel\":\"average items\"}}]}",
      "uiStateJSON": "{\"vis\":{\"defaultColors\":{\"0 - 2\":\"rgb(165,0,38)\",\"2 - 3\":\"rgb(255,255,190)\",\"3 - 4\":\"rgb(0,104,55)\"}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
    "id": "f8283bf0-52fd-11e8-a160-89cc2ad9e8e2",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Total Flight Delays",
      "visState": "{\"title\":\"[Flights] Total Flight Delays\",\"type\":\"gauge\",\"params\":{\"type\":\"gauge\",\"addTooltip\":true,\"addLegend\":true,\"isDisplayWarning\":false,\"gauge\":{\"verticalSplit\":false,\"extendRange\":true,\"percentageMode\":false,\"gaugeType\":\"Arc\",\"gaugeStyle\":\"Full\",\"backStyle\":\"Full\",\"orientation\":\"vertical\",\"colorSchema\":\"Blues\",\"gaugeColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":75},{\"from\":75,\"to\":150},{\"from\":150,\"to\":225},{\"from\":225,\"to\":300}],\"invertColors\":true,\"labels\":{\"show\":false,\"color\":\"black\"},\"scale\":{\"show\":false,\"labels\":false,\"color\":\"#333\"},\"type\":\"meter\",\"style\":{\"bgWidth\":0.9,\"width\":0.9,\"mask\":false,\"bgMask\":false,\"maskBars\":50,\"bgFill\":\"#eee\",\"bgColor\":false,\"subText\":\"\",\"fontSize\":60,\"labelColor\":true}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total Delays\"}}]}",
      "uiStateJSON": "{\"vis\":{\"defaultColors\":{\"0 - 75\":\"rgb(8,48,107)\",\"75 - 150\":\"rgb(55,135,192)\",\"150 - 225\":\"rgb(171,208,230)\",\"225 - 300\":\"rgb(247,251,255)\"}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[{\"meta\":{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"negate\":false,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"FlightDelay\",\"value\":\"true\",\"params\":{\"query\":true,\"type\":\"phrase\"}},\"query\":{\"match\":{\"FlightDelay\":{\"query\":true,\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "3ba638e0-b894-11e8-a6d9-e546fe2bba5f",
    "type": "search",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Orders",
      "description": "",
      "hits": 0,
      "columns": [
        "category",
        "sku",
        "taxful_total_price",
        "total_quantity"
      ],
      "sort": [
        "order_date",
        "desc"
      ],
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"highlightAll\":true,\"version\":true,\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
    "id": "08884800-52fe-11e8-a160-89cc2ad9e8e2",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Total Flight Cancellations",
      "visState": "{\"title\":\"[Flights] Total Flight Cancellations\",\"type\":\"gauge\",\"params\":{\"type\":\"gauge\",\"addTooltip\":true,\"addLegend\":true,\"isDisplayWarning\":false,\"gauge\":{\"verticalSplit\":false,\"extendRange\":true,\"percentageMode\":false,\"gaugeType\":\"Arc\",\"gaugeStyle\":\"Full\",\"backStyle\":\"Full\",\"orientation\":\"vertical\",\"colorSchema\":\"Blues\",\"gaugeColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":75},{\"from\":75,\"to\":150},{\"from\":150,\"to\":225},{\"from\":225,\"to\":300}],\"invertColors\":true,\"labels\":{\"show\":false,\"color\":\"black\"},\"scale\":{\"show\":false,\"labels\":false,\"color\":\"#333\"},\"type\":\"meter\",\"style\":{\"bgWidth\":0.9,\"width\":0.9,\"mask\":false,\"bgMask\":false,\"maskBars\":50,\"bgFill\":\"#eee\",\"bgColor\":false,\"subText\":\"\",\"fontSize\":60,\"labelColor\":true}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total Cancellations\"}}]}",
      "uiStateJSON": "{\"vis\":{\"defaultColors\":{\"0 - 75\":\"rgb(8,48,107)\",\"75 - 150\":\"rgb(55,135,192)\",\"150 - 225\":\"rgb(171,208,230)\",\"225 - 300\":\"rgb(247,251,255)\"}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[{\"meta\":{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"negate\":false,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"Cancelled\",\"value\":\"true\",\"params\":{\"query\":true,\"type\":\"phrase\"}},\"query\":{\"match\":{\"Cancelled\":{\"query\":true,\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "e6944e50-52fe-11e8-a160-89cc2ad9e8e2",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Origin Country vs. Destination Country",
      "visState": "{\"title\":\"[Flights] Origin Country vs. Destination Country\",\"type\":\"heatmap\",\"params\":{\"type\":\"heatmap\",\"addTooltip\":true,\"addLegend\":true,\"enableHover\":false,\"legendPosition\":\"right\",\"times\":[],\"colorsNumber\":5,\"colorSchema\":\"Blues\",\"setColorRange\":false,\"colorsRange\":[],\"invertColors\":false,\"percentageMode\":false,\"valueAxes\":[{\"show\":false,\"id\":\"ValueAxis-1\",\"type\":\"value\",\"scale\":{\"type\":\"linear\",\"defaultYExtents\":false},\"labels\":{\"show\":false,\"rotate\":0,\"overwriteColor\":false,\"color\":\"#555\"}}]},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"OriginCountry\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Origin Country\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"DestCountry\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Destination Country\"}}]}",
      "uiStateJSON": "{\"vis\":{\"defaultColors\":{\"0 - 22\":\"rgb(247,251,255)\",\"22 - 44\":\"rgb(208,225,242)\",\"44 - 66\":\"rgb(148,196,223)\",\"66 - 88\":\"rgb(74,152,201)\",\"88 - 110\":\"rgb(23,100,171)\"}}}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
      }
    }
  },
  {
    "id": "01c413e0-5395-11e8-99bf-1ba7b1bdaa61",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Total Flights",
      "visState": "{\"title\":\"[Flights] Total Flights\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":10000}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"\",\"fontSize\":36}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total Flights\"}}]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"kuery\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "9c6f83f0-bb4d-11e8-9c84-77068524bcab",
    "type": "visualization",
    "updated_at": "2018-09-18T14:17:44.622Z",
    "version": 1,
    "attributes": {
      "title": "[eCommerce] Average Sales Per Region",
      "visState": "{\"title\":\"[eCommerce] Average Sales Per Region\",\"type\":\"region_map\",\"params\":{\"legendPosition\":\"bottomright\",\"addTooltip\":true,\"colorSchema\":\"Blues\",\"selectedLayer\":{\"attribution\":\"<p><a href=\\\"http://www.naturalearthdata.com/about/terms-of-use\\\">Made with NaturalEarth</a>|<a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"weight\":1,\"name\":\"World Countries\",\"url\":\"https://vector.maps.elastic.co/blob/5659313586569216?elastic_tile_service_tos=agree&my_app_version=7.0.0-alpha1&license=f6c534b8-91b9-4499-8804-a2e9789ecc95\",\"format\":{\"type\":\"geojson\"},\"fields\":[{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},{\"name\":\"name\",\"description\":\"Country name\"},{\"name\":\"iso3\",\"description\":\"Three letter abbreviation\"}],\"created_at\":\"2017-04-26T17:12:15.978370\",\"tags\":[],\"id\":5659313586569216,\"layerId\":\"elastic_maps_service.World Countries\",\"isEMS\":true},\"emsHotLink\":\"https://maps.elastic.co/v2#file/World Countries\",\"selectedJoinField\":{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},\"isDisplayWarning\":true,\"wms\":{\"enabled\":false,\"options\":{\"format\":\"image/png\",\"transparent\":true}},\"mapZoom\":2,\"mapCenter\":[0,0],\"outlineWeight\":1,\"showAllShapes\":true},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"taxful_total_price\",\"customLabel\":\"Average Sale\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"geoip.country_iso_code\",\"size\":100,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
=======
    "id": "2edf78b0-5395-11e8-99bf-1ba7b1bdaa61",
    "type": "visualization",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "[Flights] Average Ticket Price",
      "visState": "{\"title\":\"[Flights] Average Ticket Price\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"None\",\"colorsRange\":[{\"from\":0,\"to\":10000}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":false,\"subText\":\"\",\"fontSize\":36}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"avg\",\"schema\":\"metric\",\"params\":{\"field\":\"AvgTicketPrice\",\"customLabel\":\"Avg. Ticket Price\"}}]}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"kuery\"}}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "b72dd430-bb4d-11e8-9c84-77068524bcab",
    "type": "visualization",
    "updated_at": "2018-09-18T14:18:42.554Z",
    "version": 2,
    "attributes": {
      "title": "[eCommerce] Top Selling Products",
      "visState": "{\"title\":\"[eCommerce] Top Selling Products\",\"type\":\"tagcloud\",\"params\":{\"scale\":\"linear\",\"orientation\":\"single\",\"minFontSize\":18,\"maxFontSize\":72,\"showLabel\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"products.product_name.keyword\",\"size\":7,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
=======
    "id": "ed78a660-53a0-11e8-acbd-0be0ad9d822b",
    "type": "visualization",
    "updated_at": "2018-05-09T15:55:51.195Z",
    "version": 3,
    "attributes": {
      "title": "[Flights] Airport Connections (Hover Over Airport)",
      "visState": "{\"aggs\":[],\"params\":{\"spec\":\"{\\n  $schema: https://vega.github.io/schema/vega/v3.0.json\\n  config: {\\n    kibana: {type: \\\"map\\\", latitude: 25, longitude: -70, zoom: 3}\\n  }\\n  data: [\\n    {\\n      name: table\\n      url: {\\n        index: kibana_sample_data_flights\\n        %context%: true\\n        // Uncomment to enable time filtering\\n        // %timefield%: timestamp\\n        body: {\\n          size: 0\\n          aggs: {\\n            origins: {\\n              terms: {field: \\\"OriginAirportID\\\", size: 10000}\\n              aggs: {\\n                originLocation: {\\n                  top_hits: {\\n                    size: 1\\n                    _source: {\\n                      includes: [\\\"OriginLocation\\\", \\\"Origin\\\"]\\n                    }\\n                  }\\n                }\\n                distinations: {\\n                  terms: {field: \\\"DestAirportID\\\", size: 10000}\\n                  aggs: {\\n                    destLocation: {\\n                      top_hits: {\\n                        size: 1\\n                        _source: {\\n                          includes: [\\\"DestLocation\\\"]\\n                        }\\n                      }\\n                    }\\n                  }\\n                }\\n              }\\n            }\\n          }\\n        }\\n      }\\n      format: {property: \\\"aggregations.origins.buckets\\\"}\\n      transform: [\\n        {\\n          type: geopoint\\n          projection: projection\\n          fields: [\\n            originLocation.hits.hits[0]._source.OriginLocation.lon\\n            originLocation.hits.hits[0]._source.OriginLocation.lat\\n          ]\\n        }\\n      ]\\n    }\\n    {\\n      name: selectedDatum\\n      on: [\\n        {trigger: \\\"!selected\\\", remove: true}\\n        {trigger: \\\"selected\\\", insert: \\\"selected\\\"}\\n      ]\\n    }\\n  ]\\n  signals: [\\n    {\\n      name: selected\\n      value: null\\n      on: [\\n        {events: \\\"@airport:mouseover\\\", update: \\\"datum\\\"}\\n        {events: \\\"@airport:mouseout\\\", update: \\\"null\\\"}\\n      ]\\n    }\\n  ]\\n  scales: [\\n    {\\n      name: airportSize\\n      type: linear\\n      domain: {data: \\\"table\\\", field: \\\"doc_count\\\"}\\n      range: [\\n        {signal: \\\"zoom*zoom*0.2+1\\\"}\\n        {signal: \\\"zoom*zoom*10+1\\\"}\\n      ]\\n    }\\n  ]\\n  marks: [\\n    {\\n      type: group\\n      from: {\\n        facet: {\\n          name: facetedDatum\\n          data: selectedDatum\\n          field: distinations.buckets\\n        }\\n      }\\n      data: [\\n        {\\n          name: facetDatumElems\\n          source: facetedDatum\\n          transform: [\\n            {\\n              type: geopoint\\n              projection: projection\\n              fields: [\\n                destLocation.hits.hits[0]._source.DestLocation.lon\\n                destLocation.hits.hits[0]._source.DestLocation.lat\\n              ]\\n            }\\n            {type: \\\"formula\\\", expr: \\\"{x:parent.x, y:parent.y}\\\", as: \\\"source\\\"}\\n            {type: \\\"formula\\\", expr: \\\"{x:datum.x, y:datum.y}\\\", as: \\\"target\\\"}\\n            {type: \\\"linkpath\\\", shape: \\\"diagonal\\\"}\\n          ]\\n        }\\n      ]\\n      scales: [\\n        {\\n          name: lineThickness\\n          type: linear\\n          domain: {data: \\\"facetDatumElems\\\", field: \\\"doc_count\\\"}\\n          range: [1, 8]\\n        }\\n        {\\n          name: lineOpacity\\n          type: linear\\n          domain: {data: \\\"facetDatumElems\\\", field: \\\"doc_count\\\"}\\n          range: [0.2, 0.8]\\n        }\\n      ]\\n      marks: [\\n        {\\n          from: {data: \\\"facetDatumElems\\\"}\\n          type: path\\n          interactive: false\\n          encode: {\\n            update: {\\n              path: {field: \\\"path\\\"}\\n              stroke: {value: \\\"black\\\"}\\n              strokeWidth: {scale: \\\"lineThickness\\\", field: \\\"doc_count\\\"}\\n              strokeOpacity: {scale: \\\"lineOpacity\\\", field: \\\"doc_count\\\"}\\n            }\\n          }\\n        }\\n      ]\\n    }\\n    {\\n      name: airport\\n      type: symbol\\n      from: {data: \\\"table\\\"}\\n      encode: {\\n        update: {\\n          size: {scale: \\\"airportSize\\\", field: \\\"doc_count\\\"}\\n          xc: {signal: \\\"datum.x\\\"}\\n          yc: {signal: \\\"datum.y\\\"}\\n          tooltip: {\\n            signal: \\\"{title: datum.originLocation.hits.hits[0]._source.Origin + ' (' + datum.key + ')', connnections: length(datum.distinations.buckets), flights: datum.doc_count}\\\"\\n          }\\n        }\\n      }\\n    }\\n  ]\\n}\"},\"title\":\"[Flights] Airport Connections (Hover Over Airport)\",\"type\":\"vega\"}",
>>>>>>> ecommerce data set
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
<<<<<<< HEAD
        "searchSourceJSON": "{\"index\":\"ff959d40-b880-11e8-a6d9-e546fe2bba5f\",\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
=======
        "searchSourceJSON": "{}"
>>>>>>> ecommerce data set
      }
    }
  },
  {
<<<<<<< HEAD
    "id": "ff959d40-b880-11e8-a6d9-e546fe2bba5f",
    "type": "index-pattern",
    "updated_at": "2018-09-18T14:14:35.310Z",
    "version": 1,
    "attributes": {
      "title": "kibana_sample_data_ecommerce",
      "timeFieldName": "order_date",
      "fields": "[{\"name\":\"_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_index\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_score\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_source\",\"type\":\"_source\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"category\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"category.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"currency\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"customer_birth_date\",\"type\":\"date\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"customer_first_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"customer_full_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"customer_full_name.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"customer_gender\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"customer_id\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"customer_last_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"customer_phone\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"customer_phone.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"day_of_week\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"day_of_week_i\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"email\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"geoip.city_name\",\"type\":\"string\",\"count\":2,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"geoip.continent_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"geoip.country_iso_code\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"geoip.location\",\"type\":\"geo_point\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"geoip.region_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"geoip.region_name.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"manufacturer\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"manufacturer.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"order_date\",\"type\":\"date\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"order_id\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products._id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.base_price\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.base_unit_price\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.category\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"products.category.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.created_on\",\"type\":\"date\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.discount_amount\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.discount_percentage\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.manufacturer\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"products.manufacturer.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.min_price\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.price\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.product_id\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.product_name\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"products.product_name.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.quantity\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.sku\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.tax_amount\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.taxful_price\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.taxless_price\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"products.unit_discount_amount\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"sku\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"sku.keyword\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"taxful_total_price\",\"type\":\"number\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"taxless_total_price\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"total_quantity\",\"type\":\"number\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"total_unique_products\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"user\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true}]",
      "fieldFormatMap": "{\"taxful_total_price\":{\"id\":\"number\",\"params\":{\"pattern\":\"$0,0.[00]\"}}}"
    }
  },
  {
    "id": "722b74f0-b882-11e8-a6d9-e546fe2bba5f",
    "type": "dashboard",
    "updated_at": "2018-09-18T14:19:09.753Z",
    "version": 2,
    "attributes": {
      "title": "[eCommerce] Revenue Dashboard",
      "hits": 0,
      "description": "Analyze mock eCommerce orders and revenue",
      "panelsJSON": "[{\"embeddableConfig\":{\"vis\":{\"colors\":{\"Men's Accessories\":\"#82B5D8\",\"Men's Clothing\":\"#F9BA8F\",\"Men's Shoes\":\"#F29191\",\"Women's Accessories\":\"#F4D598\",\"Women's Clothing\":\"#70DBED\",\"Women's Shoes\":\"#B7DBAB\"}}},\"gridData\":{\"x\":12,\"y\":18,\"w\":36,\"h\":10,\"i\":\"1\"},\"id\":\"37cc8650-b882-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"1\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{\"vis\":{\"colors\":{\"FEMALE\":\"#6ED0E0\",\"MALE\":\"#447EBC\"},\"legendOpen\":false}},\"gridData\":{\"x\":12,\"y\":7,\"w\":12,\"h\":11,\"i\":\"2\"},\"id\":\"ed8436b0-b88b-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"2\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{},\"gridData\":{\"x\":0,\"y\":0,\"w\":18,\"h\":7,\"i\":\"3\"},\"id\":\"09ffee60-b88c-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"3\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{},\"gridData\":{\"x\":18,\"y\":0,\"w\":30,\"h\":7,\"i\":\"4\"},\"id\":\"1c389590-b88d-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"4\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{},\"gridData\":{\"x\":0,\"y\":28,\"w\":48,\"h\":11,\"i\":\"5\"},\"id\":\"45e07720-b890-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"5\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{},\"gridData\":{\"x\":0,\"y\":18,\"w\":12,\"h\":10,\"i\":\"6\"},\"id\":\"10f1a240-b891-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"6\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{},\"gridData\":{\"x\":0,\"y\":7,\"w\":12,\"h\":11,\"i\":\"7\"},\"id\":\"b80e6540-b891-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"7\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{\"vis\":{\"colors\":{\"0 - 50\":\"#E24D42\",\"50 - 75\":\"#EAB839\",\"75 - 100\":\"#7EB26D\"},\"defaultColors\":{\"0 - 50\":\"rgb(165,0,38)\",\"50 - 75\":\"rgb(255,255,190)\",\"75 - 100\":\"rgb(0,104,55)\"},\"legendOpen\":false}},\"gridData\":{\"x\":24,\"y\":7,\"w\":12,\"h\":11,\"i\":\"8\"},\"id\":\"4b3ec120-b892-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"8\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{\"vis\":{\"colors\":{\"0 - 2\":\"#E24D42\",\"2 - 3\":\"#F2C96D\",\"3 - 4\":\"#9AC48A\"},\"defaultColors\":{\"0 - 2\":\"rgb(165,0,38)\",\"2 - 3\":\"rgb(255,255,190)\",\"3 - 4\":\"rgb(0,104,55)\"},\"legendOpen\":false}},\"gridData\":{\"x\":36,\"y\":7,\"w\":12,\"h\":11,\"i\":\"9\"},\"id\":\"9ca7aa90-b892-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"9\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{},\"gridData\":{\"x\":0,\"y\":54,\"w\":48,\"h\":18,\"i\":\"10\"},\"id\":\"3ba638e0-b894-11e8-a6d9-e546fe2bba5f\",\"panelIndex\":\"10\",\"type\":\"search\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{\"mapZoom\":2,\"mapCenter\":[28.304380682962783,-22.148437500000004]},\"gridData\":{\"x\":0,\"y\":39,\"w\":24,\"h\":15,\"i\":\"11\"},\"id\":\"9c6f83f0-bb4d-11e8-9c84-77068524bcab\",\"panelIndex\":\"11\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"embeddableConfig\":{},\"gridData\":{\"x\":24,\"y\":39,\"w\":24,\"h\":15,\"i\":\"12\"},\"id\":\"b72dd430-bb4d-11e8-9c84-77068524bcab\",\"panelIndex\":\"12\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"}]",
=======
    "id": "d3d7af60-4c81-11e8-b3d7-01146121b73d",
    "type": "index-pattern",
    "updated_at": "2018-05-09T15:49:03.736Z",
    "version": 1,
    "attributes": {
      "title": "kibana_sample_data_flights",
      "timeFieldName": "timestamp",
      "fields": "[{\"name\":\"AvgTicketPrice\",\"type\":\"number\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Cancelled\",\"type\":\"boolean\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Carrier\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Dest\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestAirportID\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestCityName\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestCountry\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestLocation\",\"type\":\"geo_point\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestRegion\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestWeather\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DistanceKilometers\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DistanceMiles\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightDelay\",\"type\":\"boolean\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightDelayMin\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightDelayType\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightNum\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightTimeHour\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightTimeMin\",\"type\":\"number\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Origin\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginAirportID\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginCityName\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginCountry\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginLocation\",\"type\":\"geo_point\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginRegion\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginWeather\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_index\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_score\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_source\",\"type\":\"_source\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"dayOfWeek\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"timestamp\",\"type\":\"date\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"hour_of_day\",\"type\":\"number\",\"count\":0,\"scripted\":true,\"script\":\"doc['timestamp'].value.hourOfDay\",\"lang\":\"painless\",\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false}]",
      "fieldFormatMap": "{\"hour_of_day\":{\"id\":\"number\",\"params\":{\"pattern\":\"00\"}},\"AvgTicketPrice\":{\"id\":\"number\",\"params\":{\"pattern\":\"$0,0.[00]\"}}}"
    }
  },
  {
    "id": "7adfa750-4c81-11e8-b3d7-01146121b73d",
    "type": "dashboard",
    "updated_at": "2018-05-09T15:59:04.578Z",
    "version": 4,
    "attributes": {
      "title": "[Flights] Global Flight Dashboard",
      "hits": 0,
      "description": "Analyze mock flight data for ES-Air, Logstash Airways, Kibana Airlines and JetBeats",
      "panelsJSON": "[{\"panelIndex\":\"1\",\"gridData\":{\"x\":0,\"y\":0,\"w\":32,\"h\":7,\"i\":\"1\"},\"embeddableConfig\":{},\"id\":\"aeb212e0-4c84-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"3\",\"gridData\":{\"x\":17,\"y\":7,\"w\":23,\"h\":12,\"i\":\"3\"},\"embeddableConfig\":{\"vis\":{\"colors\":{\"Average Ticket Price\":\"#0A50A1\",\"Flight Count\":\"#82B5D8\"},\"legendOpen\":false}},\"id\":\"c8fc3d30-4c87-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"4\",\"gridData\":{\"x\":0,\"y\":85,\"w\":48,\"h\":15,\"i\":\"4\"},\"embeddableConfig\":{},\"id\":\"571aaf70-4c88-11e8-b3d7-01146121b73d\",\"type\":\"search\",\"version\":\"6.3.0\"},{\"panelIndex\":\"5\",\"gridData\":{\"x\":0,\"y\":7,\"w\":17,\"h\":12,\"i\":\"5\"},\"embeddableConfig\":{\"vis\":{\"colors\":{\"ES-Air\":\"#447EBC\",\"JetBeats\":\"#65C5DB\",\"Kibana Airlines\":\"#BA43A9\",\"Logstash Airways\":\"#E5AC0E\"},\"legendOpen\":false}},\"id\":\"8f4d0c00-4c86-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"6\",\"gridData\":{\"x\":24,\"y\":33,\"w\":24,\"h\":14,\"i\":\"6\"},\"embeddableConfig\":{\"vis\":{\"colors\":{\"Carrier Delay\":\"#5195CE\",\"Late Aircraft Delay\":\"#1F78C1\",\"NAS Delay\":\"#70DBED\",\"No Delay\":\"#BADFF4\",\"Security Delay\":\"#052B51\",\"Weather Delay\":\"#6ED0E0\"}}},\"id\":\"f8290060-4c88-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"7\",\"gridData\":{\"x\":24,\"y\":19,\"w\":24,\"h\":14,\"i\":\"7\"},\"embeddableConfig\":{},\"id\":\"bcb63b50-4c89-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"10\",\"gridData\":{\"x\":0,\"y\":35,\"w\":24,\"h\":12,\"i\":\"10\"},\"embeddableConfig\":{\"vis\":{\"colors\":{\"Count\":\"#1F78C1\"},\"legendOpen\":false}},\"id\":\"9886b410-4c8b-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"13\",\"gridData\":{\"x\":10,\"y\":19,\"w\":14,\"h\":8,\"i\":\"13\"},\"embeddableConfig\":{\"vis\":{\"colors\":{\"Count\":\"#1F78C1\"},\"legendOpen\":false}},\"id\":\"76e3c090-4c8c-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"14\",\"gridData\":{\"x\":10,\"y\":27,\"w\":14,\"h\":8,\"i\":\"14\"},\"embeddableConfig\":{\"vis\":{\"colors\":{\"Count\":\"#1F78C1\"},\"legendOpen\":false}},\"id\":\"707665a0-4c8c-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"18\",\"gridData\":{\"x\":24,\"y\":70,\"w\":24,\"h\":15,\"i\":\"18\"},\"embeddableConfig\":{\"mapCenter\":[27.421687059550266,15.371002131141724],\"mapZoom\":1},\"id\":\"79e8ff60-4c8e-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"21\",\"gridData\":{\"x\":0,\"y\":62,\"w\":48,\"h\":8,\"i\":\"21\"},\"embeddableConfig\":{},\"id\":\"293b5a30-4c8f-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"22\",\"gridData\":{\"x\":32,\"y\":0,\"w\":16,\"h\":7,\"i\":\"22\"},\"embeddableConfig\":{},\"id\":\"129be430-4c93-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"23\",\"gridData\":{\"x\":0,\"y\":70,\"w\":24,\"h\":15,\"i\":\"23\"},\"embeddableConfig\":{\"mapCenter\":[42.19556096274418,9.536742995308601e-7],\"mapZoom\":1},\"id\":\"334084f0-52fd-11e8-a160-89cc2ad9e8e2\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"25\",\"gridData\":{\"x\":0,\"y\":19,\"w\":10,\"h\":8,\"i\":\"25\"},\"embeddableConfig\":{\"vis\":{\"defaultColors\":{\"0 - 50\":\"rgb(247,251,255)\",\"100 - 150\":\"rgb(107,174,214)\",\"150 - 200\":\"rgb(33,113,181)\",\"200 - 250\":\"rgb(8,48,107)\",\"50 - 100\":\"rgb(198,219,239)\"},\"legendOpen\":false}},\"id\":\"f8283bf0-52fd-11e8-a160-89cc2ad9e8e2\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"27\",\"gridData\":{\"x\":0,\"y\":27,\"w\":10,\"h\":8,\"i\":\"27\"},\"embeddableConfig\":{\"vis\":{\"defaultColors\":{\"0 - 50\":\"rgb(247,251,255)\",\"100 - 150\":\"rgb(107,174,214)\",\"150 - 200\":\"rgb(33,113,181)\",\"200 - 250\":\"rgb(8,48,107)\",\"50 - 100\":\"rgb(198,219,239)\"},\"legendOpen\":false}},\"id\":\"08884800-52fe-11e8-a160-89cc2ad9e8e2\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"28\",\"gridData\":{\"x\":0,\"y\":47,\"w\":24,\"h\":15,\"i\":\"28\"},\"embeddableConfig\":{\"vis\":{\"defaultColors\":{\"0 - 11\":\"rgb(247,251,255)\",\"11 - 22\":\"rgb(208,225,242)\",\"22 - 33\":\"rgb(148,196,223)\",\"33 - 44\":\"rgb(74,152,201)\",\"44 - 55\":\"rgb(23,100,171)\"},\"legendOpen\":false}},\"id\":\"e6944e50-52fe-11e8-a160-89cc2ad9e8e2\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"29\",\"gridData\":{\"x\":40,\"y\":7,\"w\":8,\"h\":6,\"i\":\"29\"},\"embeddableConfig\":{},\"id\":\"01c413e0-5395-11e8-99bf-1ba7b1bdaa61\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"30\",\"gridData\":{\"x\":40,\"y\":13,\"w\":8,\"h\":6,\"i\":\"30\"},\"embeddableConfig\":{},\"id\":\"2edf78b0-5395-11e8-99bf-1ba7b1bdaa61\",\"type\":\"visualization\",\"version\":\"6.3.0\"},{\"panelIndex\":\"31\",\"gridData\":{\"x\":24,\"y\":47,\"w\":24,\"h\":15,\"i\":\"31\"},\"embeddableConfig\":{},\"id\":\"ed78a660-53a0-11e8-acbd-0be0ad9d822b\",\"type\":\"visualization\",\"version\":\"6.3.0\"}]",
>>>>>>> ecommerce data set
      "optionsJSON": "{\"darkTheme\":false,\"hidePanelTitles\":false,\"useMargins\":true}",
      "version": 1,
      "timeRestore": true,
      "timeTo": "now",
<<<<<<< HEAD
      "timeFrom": "now-7d",
      "refreshInterval": {
        "pause": false,
        "value": 900000
      },
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[]}"
=======
      "timeFrom": "now-24h",
      "refreshInterval": {
        "display": "15 minutes",
        "pause": false,
        "section": 2,
        "value": 900000
      },
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[],\"highlightAll\":true,\"version\":true}"
>>>>>>> ecommerce data set
      }
    }
  }
];
