/* eslint max-len: 0 */

export const savedObjects = [
    {
      "id": "aeb212e0-4c84-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T14:42:18.510Z",
      "version": 1,
      "attributes": {
        "title": "[Flights] Controls",
        "visState": "{\"title\":\"[Flights] Controls\",\"type\":\"input_control_vis\",\"params\":{\"controls\":[{\"id\":\"1525098134264\",\"indexPattern\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"fieldName\":\"OriginCityName\",\"parent\":\"\",\"label\":\"Origin City\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"size\":100,\"order\":\"desc\"}},{\"id\":\"1525099277699\",\"indexPattern\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"fieldName\":\"DestCityName\",\"parent\":\"1525098134264\",\"label\":\"Destination City\",\"type\":\"list\",\"options\":{\"type\":\"terms\",\"multiselect\":true,\"size\":100,\"order\":\"desc\"}},{\"id\":\"1525099307278\",\"indexPattern\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"fieldName\":\"AvgTicketPrice\",\"parent\":\"\",\"label\":\"Average Ticket Price\",\"type\":\"range\",\"options\":{\"decimalPlaces\":0,\"step\":10}}],\"updateFiltersOnChange\":false,\"useTimeFilter\":false,\"pinFilters\":false},\"aggs\":[]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{}"
        }
      }
    },
    {
      "id": "6bea0e70-4c86-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:51:22.645Z",
      "version": 3,
      "attributes": {
        "title": "[Flights] Origin Country vs. Hour of Departure",
        "visState": "{\"title\":\"[Flights] Origin Country vs. Hour of Departure\",\"type\":\"heatmap\",\"params\":{\"type\":\"heatmap\",\"addTooltip\":true,\"addLegend\":true,\"enableHover\":false,\"legendPosition\":\"right\",\"times\":[],\"colorsNumber\":5,\"colorSchema\":\"Blues\",\"setColorRange\":false,\"colorsRange\":[],\"invertColors\":false,\"percentageMode\":false,\"valueAxes\":[{\"show\":false,\"id\":\"ValueAxis-1\",\"type\":\"value\",\"scale\":{\"type\":\"linear\",\"defaultYExtents\":false},\"labels\":{\"show\":false,\"rotate\":0,\"overwriteColor\":false,\"color\":\"#555\"}}]},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"OriginCountry\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Origin Country\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"hour_of_day\",\"size\":24,\"order\":\"asc\",\"orderBy\":\"_term\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Hour Of Day\"}}]}",
        "uiStateJSON": "{\"vis\":{\"defaultColors\":{\"0 - 4\":\"rgb(247,251,255)\",\"4 - 7\":\"rgb(208,225,242)\",\"7 - 10\":\"rgb(148,196,223)\",\"10 - 13\":\"rgb(74,152,201)\",\"13 - 16\":\"rgb(23,100,171)\"}}}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "c8fc3d30-4c87-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:24:54.991Z",
      "version": 4,
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
      "updated_at": "2018-04-30T15:17:51.047Z",
      "version": 3,
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
      "updated_at": "2018-04-30T14:55:58.868Z",
      "version": 2,
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
      "updated_at": "2018-04-30T15:13:36.782Z",
      "version": 3,
      "attributes": {
        "title": "[Flights] Delay Type",
        "visState": "{\"title\":\"[Flights] Delay Type\",\"type\":\"area\",\"params\":{\"type\":\"area\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"area\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"drawLinesBetweenPoints\":true,\"showCircles\":true,\"interpolate\":\"linear\",\"valueAxis\":\"ValueAxis-1\"}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"date_histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"timestamp\",\"interval\":\"auto\",\"customInterval\":\"2h\",\"min_doc_count\":1,\"extended_bounds\":{}}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"FlightDelayType\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
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
      "updated_at": "2018-04-30T16:19:13.968Z",
      "version": 3,
      "attributes": {
        "title": "[Flights] Delays & Cancellations",
        "visState": "{\"title\":\"[Flights] Delays & Cancellations\",\"type\":\"metrics\",\"params\":{\"id\":\"61ca57f0-469d-11e7-af02-69e470af7417\",\"type\":\"timeseries\",\"series\":[{\"id\":\"61ca57f1-469d-11e7-af02-69e470af7417\",\"color\":\"rgba(0,156,224,1)\",\"split_mode\":\"everything\",\"metrics\":[{\"id\":\"61ca57f2-469d-11e7-af02-69e470af7417\",\"type\":\"filter_ratio\",\"numerator\":\"FlightDelay:true\"}],\"seperate_axis\":0,\"axis_position\":\"right\",\"formatter\":\"percent\",\"chart_type\":\"line\",\"line_width\":1,\"point_size\":1,\"fill\":0.5,\"stacked\":\"none\",\"label\":\"Percent Delays\"}],\"time_field\":\"timestamp\",\"index_pattern\":\"kibana_sample_data_flights\",\"interval\":\">=1h\",\"axis_position\":\"left\",\"axis_formatter\":\"number\",\"show_legend\":1,\"show_grid\":1,\"annotations\":[{\"fields\":\"FlightDelay,Cancelled,Carrier\",\"template\":\"{{Carrier}}: Flight Delayed and Cancelled!\",\"index_pattern\":\"kibana_sample_data_flights\",\"query_string\":\"FlightDelay:true AND Cancelled:true\",\"id\":\"53b7dff0-4c89-11e8-a66a-6989ad5a0a39\",\"color\":\"#F00\",\"time_field\":\"timestamp\",\"icon\":\"fa-exclamation-triangle\",\"ignore_global_filters\":1,\"ignore_panel_filters\":1}],\"legend_position\":\"bottom\"},\"aggs\":[]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{}"
        }
      }
    },
    {
      "id": "9886b410-4c8b-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:31:47.793Z",
      "version": 1,
      "attributes": {
        "title": "[Flights] Delay Buckets",
        "visState": "{\"title\":\"[Flights] Delay Buckets\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"LeftAxis-1\",\"type\":\"value\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"histogram\",\"schema\":\"segment\",\"params\":{\"field\":\"FlightDelayMin\",\"interval\":30,\"extended_bounds\":{},\"customLabel\":\"Flight Delay Minutes\"}}]}",
        "uiStateJSON": "{\"vis\":{\"legendOpen\":false}}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[{\"meta\":{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"negate\":true,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"FlightDelayMin\",\"value\":\"0\",\"params\":{\"query\":0,\"type\":\"phrase\"}},\"query\":{\"match\":{\"FlightDelayMin\":{\"query\":0,\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "d95eef10-4c8c-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:42:09.535Z",
      "version": 3,
      "attributes": {
        "title": "[Flights] Total Flight Cancellations",
        "visState": "{\"title\":\"[Flights] Total Flight Cancellations\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Reds\",\"metricColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":1000}],\"labels\":{\"show\":true},\"invertColors\":false,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":true,\"subText\":\"\",\"fontSize\":60}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total Cancellations\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[{\"meta\":{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"negate\":false,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"Cancelled\",\"value\":\"true\",\"params\":{\"query\":true,\"type\":\"phrase\"}},\"query\":{\"match\":{\"Cancelled\":{\"query\":true,\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "9ce9f1b0-4c8c-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:41:51.035Z",
      "version": 3,
      "attributes": {
        "title": "[Flights] Total Flight Delays",
        "visState": "{\"title\":\"[Flights] Total Flight Delays\",\"type\":\"metric\",\"params\":{\"addTooltip\":true,\"addLegend\":false,\"type\":\"metric\",\"metric\":{\"percentageMode\":false,\"useRanges\":false,\"colorSchema\":\"Green to Red\",\"metricColorMode\":\"Labels\",\"colorsRange\":[{\"from\":0,\"to\":1000}],\"labels\":{\"show\":true},\"invertColors\":true,\"style\":{\"bgFill\":\"#000\",\"bgColor\":false,\"labelColor\":true,\"subText\":\"\",\"fontSize\":60}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"Total Delays\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[{\"meta\":{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"negate\":false,\"disabled\":false,\"alias\":null,\"type\":\"phrase\",\"key\":\"FlightDelay\",\"value\":\"true\",\"params\":{\"query\":true,\"type\":\"phrase\"}},\"query\":{\"match\":{\"FlightDelay\":{\"query\":true,\"type\":\"phrase\"}}},\"$state\":{\"store\":\"appState\"}}],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "76e3c090-4c8c-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T16:11:09.971Z",
      "version": 3,
      "attributes": {
        "title": "[Flights] Flight Delays",
        "visState": "{\"title\":\"[Flights] Flight Delays\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"BottomAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"FlightDelay\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Flight Delays\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "707665a0-4c8c-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T16:11:38.348Z",
      "version": 2,
      "attributes": {
        "title": "[Flights] Flight Cancellations",
        "visState": "{\"title\":\"[Flights] Flight Cancellations\",\"type\":\"histogram\",\"params\":{\"type\":\"histogram\",\"grid\":{\"categoryLines\":false,\"style\":{\"color\":\"#eee\"}},\"categoryAxes\":[{\"id\":\"CategoryAxis-1\",\"type\":\"category\",\"position\":\"left\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\"},\"labels\":{\"show\":true,\"truncate\":100},\"title\":{}}],\"valueAxes\":[{\"id\":\"ValueAxis-1\",\"name\":\"BottomAxis-1\",\"type\":\"value\",\"position\":\"bottom\",\"show\":true,\"style\":{},\"scale\":{\"type\":\"linear\",\"mode\":\"normal\"},\"labels\":{\"show\":true,\"rotate\":0,\"filter\":false,\"truncate\":100},\"title\":{\"text\":\"Count\"}}],\"seriesParams\":[{\"show\":\"true\",\"type\":\"histogram\",\"mode\":\"stacked\",\"data\":{\"label\":\"Count\",\"id\":\"1\"},\"valueAxis\":\"ValueAxis-1\",\"drawLinesBetweenPoints\":true,\"showCircles\":true}],\"addTooltip\":true,\"addLegend\":true,\"legendPosition\":\"right\",\"times\":[],\"addTimeMarker\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{\"customLabel\":\"\"}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"Cancelled\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Flight Cancellations\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "171d78e0-4c8c-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:51:51.885Z",
      "version": 2,
      "attributes": {
        "title": "[Flights] Destination Country vs. Hour of Arrival",
        "visState": "{\"title\":\"[Flights] Destination Country vs. Hour of Arrival\",\"type\":\"heatmap\",\"params\":{\"type\":\"heatmap\",\"addTooltip\":true,\"addLegend\":true,\"enableHover\":false,\"legendPosition\":\"right\",\"times\":[],\"colorsNumber\":5,\"colorSchema\":\"Blues\",\"setColorRange\":false,\"colorsRange\":[],\"invertColors\":false,\"percentageMode\":false,\"valueAxes\":[{\"show\":false,\"id\":\"ValueAxis-1\",\"type\":\"value\",\"scale\":{\"type\":\"linear\",\"defaultYExtents\":false},\"labels\":{\"show\":false,\"rotate\":0,\"overwriteColor\":false,\"color\":\"#555\"}}]},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"group\",\"params\":{\"field\":\"DestCountry\",\"size\":5,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Origin Country\"}},{\"id\":\"3\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"hour_of_day\",\"size\":24,\"order\":\"asc\",\"orderBy\":\"_term\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\",\"customLabel\":\"Hour Of Day\"}}]}",
        "uiStateJSON": "{\"vis\":{\"defaultColors\":{\"0 - 3\":\"rgb(247,251,255)\",\"3 - 6\":\"rgb(208,225,242)\",\"6 - 9\":\"rgb(148,196,223)\",\"9 - 12\":\"rgb(74,152,201)\",\"12 - 14\":\"rgb(23,100,171)\"}}}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "eb7938d0-4c8d-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:48:25.949Z",
      "version": 1,
      "attributes": {
        "title": "[Flights] Origin Airport",
        "visState": "{\"title\":\"[Flights] Origin Airport\",\"type\":\"tile_map\",\"params\":{\"colorSchema\":\"Yellow to Red\",\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"addTooltip\":true,\"heatClusterSize\":1.5,\"legendPosition\":\"bottomright\",\"mapZoom\":2,\"mapCenter\":[0,0],\"wms\":{\"enabled\":false,\"options\":{\"format\":\"image/png\",\"transparent\":true},\"baseLayersAreLoaded\":{},\"tmsLayers\":[{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}],\"selectedTmsLayer\":{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"OriginLocation\",\"autoPrecision\":true,\"isFilteredByCollar\":true,\"useGeocentroid\":true,\"precision\":2}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "1dd7a960-4c8e-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:49:50.454Z",
      "version": 1,
      "attributes": {
        "title": "[Flights] Origin Country",
        "visState": "{\"title\":\"[Flights] Origin Country\",\"type\":\"region_map\",\"params\":{\"legendPosition\":\"bottomright\",\"addTooltip\":true,\"colorSchema\":\"Blues\",\"selectedLayer\":{\"attribution\":\"<p><a href=\\\"http://www.naturalearthdata.com/about/terms-of-use\\\">Made with NaturalEarth</a> | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"name\":\"World Countries\",\"weight\":1,\"format\":{\"type\":\"geojson\"},\"url\":\"https://vector.maps.elastic.co/blob/5659313586569216?elastic_tile_service_tos=agree&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"fields\":[{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},{\"name\":\"name\",\"description\":\"Country name\"},{\"name\":\"iso3\",\"description\":\"Three letter abbreviation\"}],\"created_at\":\"2017-04-26T17:12:15.978370\",\"tags\":[],\"id\":5659313586569216,\"layerId\":\"elastic_maps_service.World Countries\"},\"selectedJoinField\":{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},\"isDisplayWarning\":false,\"wms\":{\"enabled\":false,\"options\":{\"format\":\"image/png\",\"transparent\":true},\"baseLayersAreLoaded\":{},\"tmsLayers\":[{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}],\"selectedTmsLayer\":{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}},\"mapZoom\":2,\"mapCenter\":[0,0],\"outlineWeight\":1,\"showAllShapes\":true},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"OriginCountry\",\"size\":100,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "79e8ff60-4c8e-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:52:36.521Z",
      "version": 2,
      "attributes": {
        "title": "[Flights] Destination Airport",
        "visState": "{\"title\":\"[Flights] Destination Airport\",\"type\":\"tile_map\",\"params\":{\"colorSchema\":\"Yellow to Red\",\"mapType\":\"Scaled Circle Markers\",\"isDesaturated\":true,\"addTooltip\":true,\"heatClusterSize\":1.5,\"legendPosition\":\"bottomright\",\"mapZoom\":2,\"mapCenter\":[0,0],\"wms\":{\"enabled\":false,\"options\":{\"format\":\"image/png\",\"transparent\":true},\"baseLayersAreLoaded\":{},\"tmsLayers\":[{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}],\"selectedTmsLayer\":{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}}},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"geohash_grid\",\"schema\":\"segment\",\"params\":{\"field\":\"DestLocation\",\"autoPrecision\":true,\"isFilteredByCollar\":true,\"useGeocentroid\":true,\"precision\":2}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "910856f0-4c8e-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:53:42.937Z",
      "version": 2,
      "attributes": {
        "title": "[Flights] Destination Country",
        "visState": "{\"title\":\"[Flights] Destination Country\",\"type\":\"region_map\",\"params\":{\"legendPosition\":\"bottomright\",\"addTooltip\":true,\"colorSchema\":\"Blues\",\"selectedLayer\":{\"attribution\":\"<p><a href=\\\"http://www.naturalearthdata.com/about/terms-of-use\\\">Made with NaturalEarth</a> | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"name\":\"World Countries\",\"weight\":1,\"format\":{\"type\":\"geojson\"},\"url\":\"https://vector.maps.elastic.co/blob/5659313586569216?elastic_tile_service_tos=agree&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"fields\":[{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},{\"name\":\"name\",\"description\":\"Country name\"},{\"name\":\"iso3\",\"description\":\"Three letter abbreviation\"}],\"created_at\":\"2017-04-26T17:12:15.978370\",\"tags\":[],\"id\":5659313586569216,\"layerId\":\"elastic_maps_service.World Countries\"},\"selectedJoinField\":{\"name\":\"iso2\",\"description\":\"Two letter abbreviation\"},\"isDisplayWarning\":false,\"wms\":{\"enabled\":false,\"options\":{\"format\":\"image/png\",\"transparent\":true},\"baseLayersAreLoaded\":{},\"tmsLayers\":[{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}],\"selectedTmsLayer\":{\"id\":\"road_map\",\"url\":\"https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana&my_app_version=7.0.0-alpha1&license=686f9ec6-d775-44f0-b334-38caf85da617\",\"minZoom\":0,\"maxZoom\":18,\"attribution\":\"<p>&#169; <a href=\\\"http://www.openstreetmap.org/copyright\\\">OpenStreetMap</a> contributors | <a href=\\\"https://www.elastic.co/elastic-maps-service\\\">Elastic Maps Service</a></p>&#10;\",\"subdomains\":[]}},\"mapZoom\":2,\"mapCenter\":[0,0],\"outlineWeight\":1,\"showAllShapes\":true},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"DestCountry\",\"size\":100,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"language\":\"lucene\",\"query\":\"\"}}"
        }
      }
    },
    {
      "id": "1ce53da0-4c8f-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:56:58.362Z",
      "version": 1,
      "attributes": {
        "title": "[Flights] Origin Weather",
        "visState": "{\"title\":\"[Flights] Origin Weather\",\"type\":\"tagcloud\",\"params\":{\"scale\":\"linear\",\"orientation\":\"single\",\"minFontSize\":18,\"maxFontSize\":72,\"showLabel\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"OriginWeather\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "293b5a30-4c8f-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T15:57:32.067Z",
      "version": 2,
      "attributes": {
        "title": "[Flights] Destination Weather",
        "visState": "{\"title\":\"[Flights] Destination Weather\",\"type\":\"tagcloud\",\"params\":{\"scale\":\"linear\",\"orientation\":\"single\",\"minFontSize\":18,\"maxFontSize\":72,\"showLabel\":false},\"aggs\":[{\"id\":\"1\",\"enabled\":true,\"type\":\"count\",\"schema\":\"metric\",\"params\":{}},{\"id\":\"2\",\"enabled\":true,\"type\":\"terms\",\"schema\":\"segment\",\"params\":{\"field\":\"DestWeather\",\"size\":10,\"order\":\"desc\",\"orderBy\":\"1\",\"otherBucket\":false,\"otherBucketLabel\":\"Other\",\"missingBucket\":false,\"missingBucketLabel\":\"Missing\"}}]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"index\":\"d3d7af60-4c81-11e8-b3d7-01146121b73d\",\"filter\":[],\"query\":{\"query\":\"\",\"language\":\"lucene\"}}"
        }
      }
    },
    {
      "id": "129be430-4c93-11e8-b3d7-01146121b73d",
      "type": "visualization",
      "updated_at": "2018-04-30T16:25:19.091Z",
      "version": 1,
      "attributes": {
        "title": "[Flights] Markdown Instructions",
        "visState": "{\"title\":\"[Flights] Markdown Instructions\",\"type\":\"markdown\",\"params\":{\"fontSize\":12,\"openLinksInNewTab\":false,\"markdown\":\"### Elastic Flights Sample Data\\nThis dashboard contains mock flight data. Use the input controls or click into a visualization to filter the entire dashboard. Click `Edit` to move around, resize or edit any visualizations.\"},\"aggs\":[]}",
        "uiStateJSON": "{}",
        "description": "",
        "version": 1,
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{}"
        }
      }
    },
    {
      "id": "d3d7af60-4c81-11e8-b3d7-01146121b73d",
      "type": "index-pattern",
      "updated_at": "2018-04-30T15:17:16.322Z",
      "version": 14,
      "attributes": {
        "title": "kibana_sample_data_flights",
        "timeFieldName": "timestamp",
        "fields": "[{\"name\":\"AvgTicketPrice\",\"type\":\"number\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Cancelled\",\"type\":\"boolean\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Carrier\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Dest\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestAirportID\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestCityName\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestCountry\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestLocation\",\"type\":\"geo_point\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestRegion\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DestWeather\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DistanceKilometers\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"DistanceMiles\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightDelay\",\"type\":\"boolean\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightDelayMin\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightDelayType\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightNum\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightTimeHour\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"FlightTimeMin\",\"type\":\"number\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"Origin\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginAirportID\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginCityName\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginCountry\",\"type\":\"string\",\"count\":1,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginLocation\",\"type\":\"geo_point\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginRegion\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"OriginWeather\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_index\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_score\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_source\",\"type\":\"_source\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"dayOfWeek\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"timestamp\",\"type\":\"date\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"hour_of_day\",\"type\":\"number\",\"count\":0,\"scripted\":true,\"script\":\"doc['timestamp'].date.hourOfDay\",\"lang\":\"painless\",\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false}]",
        "fieldFormatMap": "{\"hour_of_day\":{\"id\":\"number\",\"params\":{\"pattern\":\"00\"}},\"AvgTicketPrice\":{\"id\":\"number\",\"params\":{\"pattern\":\"0,0.[00]\"}}}"
      }
    },
    {
      "id": "7adfa750-4c81-11e8-b3d7-01146121b73d",
      "type": "dashboard",
      "updated_at": "2018-04-30T16:34:25.478Z",
      "version": 19,
      "attributes": {
        "title": "[Flights] Global Flight Dashboard",
        "hits": 0,
        "description": "A sample data dashboard filled with mock flight data",
        "panelsJSON": "[{\"panelIndex\":\"1\",\"gridData\":{\"x\":0,\"y\":0,\"w\":33,\"h\":7,\"i\":\"1\"},\"embeddableConfig\":{},\"id\":\"aeb212e0-4c84-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"2\",\"gridData\":{\"x\":0,\"y\":51,\"w\":24,\"h\":15,\"i\":\"2\"},\"embeddableConfig\":{\"vis\":{\"defaultColors\":{\"0 - 4\":\"rgb(247,252,245)\",\"12 - 16\":\"rgb(35,139,69)\",\"4 - 8\":\"rgb(199,233,192)\",\"8 - 12\":\"rgb(116,196,118)\"},\"legendOpen\":false}},\"id\":\"6bea0e70-4c86-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"3\",\"gridData\":{\"x\":18,\"y\":7,\"w\":30,\"h\":15,\"i\":\"3\"},\"embeddableConfig\":{\"vis\":{\"colors\":{\"Average Ticket Price\":\"#629E51\",\"Flight Count\":\"#AEA2E0\"},\"legendOpen\":false}},\"id\":\"c8fc3d30-4c87-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"4\",\"gridData\":{\"x\":0,\"y\":108,\"w\":48,\"h\":15,\"i\":\"4\"},\"embeddableConfig\":{},\"id\":\"571aaf70-4c88-11e8-b3d7-01146121b73d\",\"type\":\"search\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"5\",\"gridData\":{\"x\":0,\"y\":7,\"w\":18,\"h\":15,\"i\":\"5\"},\"embeddableConfig\":{},\"id\":\"8f4d0c00-4c86-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"6\",\"gridData\":{\"x\":24,\"y\":36,\"w\":24,\"h\":15,\"i\":\"6\"},\"embeddableConfig\":{},\"id\":\"f8290060-4c88-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"7\",\"gridData\":{\"x\":24,\"y\":22,\"w\":24,\"h\":14,\"i\":\"7\"},\"embeddableConfig\":{},\"id\":\"bcb63b50-4c89-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"10\",\"gridData\":{\"x\":0,\"y\":36,\"w\":24,\"h\":15,\"i\":\"10\"},\"embeddableConfig\":{},\"id\":\"9886b410-4c8b-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"11\",\"gridData\":{\"x\":0,\"y\":29,\"w\":10,\"h\":7,\"i\":\"11\"},\"embeddableConfig\":{},\"id\":\"d95eef10-4c8c-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"12\",\"gridData\":{\"x\":0,\"y\":22,\"w\":10,\"h\":7,\"i\":\"12\"},\"embeddableConfig\":{},\"id\":\"9ce9f1b0-4c8c-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"13\",\"gridData\":{\"x\":10,\"y\":22,\"w\":14,\"h\":7,\"i\":\"13\"},\"embeddableConfig\":{\"vis\":{\"legendOpen\":false}},\"id\":\"76e3c090-4c8c-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"14\",\"gridData\":{\"x\":10,\"y\":29,\"w\":14,\"h\":7,\"i\":\"14\"},\"embeddableConfig\":{\"vis\":{\"legendOpen\":false}},\"id\":\"707665a0-4c8c-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"15\",\"gridData\":{\"x\":24,\"y\":51,\"w\":24,\"h\":15,\"i\":\"15\"},\"embeddableConfig\":{\"vis\":{\"defaultColors\":{\"0 - 3\":\"rgb(247,251,255)\",\"12 - 14\":\"rgb(23,100,171)\",\"3 - 6\":\"rgb(208,225,242)\",\"6 - 9\":\"rgb(148,196,223)\",\"9 - 12\":\"rgb(74,152,201)\"},\"legendOpen\":false}},\"id\":\"171d78e0-4c8c-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"16\",\"gridData\":{\"x\":0,\"y\":78,\"w\":24,\"h\":15,\"i\":\"16\"},\"embeddableConfig\":{},\"id\":\"eb7938d0-4c8d-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"17\",\"gridData\":{\"x\":0,\"y\":93,\"w\":24,\"h\":15,\"i\":\"17\"},\"embeddableConfig\":{\"mapCenter\":[42.75908134865102,9.536742995308601e-7],\"mapZoom\":1},\"id\":\"1dd7a960-4c8e-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"18\",\"gridData\":{\"x\":24,\"y\":78,\"w\":24,\"h\":15,\"i\":\"18\"},\"embeddableConfig\":{},\"id\":\"79e8ff60-4c8e-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"19\",\"gridData\":{\"x\":24,\"y\":93,\"w\":24,\"h\":15,\"i\":\"19\"},\"embeddableConfig\":{\"mapCenter\":[42.75908134865102,9.536742995308601e-7],\"mapZoom\":1},\"id\":\"910856f0-4c8e-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"20\",\"gridData\":{\"x\":0,\"y\":66,\"w\":24,\"h\":12,\"i\":\"20\"},\"embeddableConfig\":{},\"id\":\"1ce53da0-4c8f-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"21\",\"gridData\":{\"x\":24,\"y\":66,\"w\":24,\"h\":12,\"i\":\"21\"},\"embeddableConfig\":{},\"id\":\"293b5a30-4c8f-11e8-b3d7-01146121b73d\",\"type\":\"visualization\",\"version\":\"7.0.0-alpha1\"},{\"panelIndex\":\"22\",\"gridData\":{\"x\":33,\"y\":0,\"w\":15,\"h\":7,\"i\":\"22\"},\"version\":\"7.0.0-alpha1\",\"type\":\"visualization\",\"id\":\"129be430-4c93-11e8-b3d7-01146121b73d\",\"embeddableConfig\":{}}]",
        "optionsJSON": "{\"darkTheme\":false,\"hidePanelTitles\":false,\"useMargins\":true}",
        "version": 1,
        "timeRestore": true,
        "timeTo": "now",
        "timeFrom": "now-24h",
        "refreshInterval": {
          "display": "15 minutes",
          "pause": false,
          "section": 2,
          "value": 900000
        },
        "kibanaSavedObjectMeta": {
          "searchSourceJSON": "{\"query\":{\"language\":\"lucene\",\"query\":\"\"},\"filter\":[],\"highlightAll\":true,\"version\":true}"
        }
      }
    }
  ];
