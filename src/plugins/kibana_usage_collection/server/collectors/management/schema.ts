/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { UsageStats } from './types';

export const stackManagementSchema: MakeSchemaFrom<UsageStats | any> = {
  // sensitive
  'timelion:quandl.key': {
    type: 'keyword',
    _meta: { description: 'timelion:quandl.key was changed.' },
  },
  'securitySolution:defaultIndex': {
    type: 'keyword',
    _meta: { description: 'securitySolution:defaultIndex was changed.' },
  },
  'securitySolution:newsFeedUrl': {
    type: 'keyword',
    _meta: { description: 'securitySolution:newsFeedUrl was changed.' },
  },
  'xpackReporting:customPdfLogo': {
    type: 'keyword',
    _meta: { description: 'xpackReporting:customPdfLogo was changed.' },
  },
  'notifications:banner': {
    type: 'keyword',
    _meta: { description: 'notifications:banner was changed.' },
  },
  'timelion:graphite.url': {
    type: 'keyword',
    _meta: { description: 'timelion:graphite was changed.' },
  },
  'xpackDashboardMode:roles': {
    type: 'keyword',
    _meta: { description: 'xpackDashboardMode:roles was changed.' },
  },
  'securitySolution:ipReputationLinks': {
    type: 'keyword',
    _meta: { description: 'securitySolution:ipReputationLinks was changed.' },
  },
  // non-sensitive
  'visualize:enableLabs': {
    type: 'boolean',
    _meta: { description: 'Non-default value of visualize:enableLabs' },
  },
  'visualization:heatmap:maxBuckets': {
    type: 'long',
    _meta: { description: 'Non-default value of visualivisualization:heatmapng' },
  },
  'visualization:colorMapping': {
    type: 'text',
    _meta: { description: 'Non-default value of visualization:colorMapping' },
  },
  'visualization:regionmap:showWarnings': {
    type: 'boolean',
    _meta: { description: 'Non-default value of visualization:regionmap' },
  },
  'visualization:dimmingOpacity': {
    type: 'float',
    _meta: { description: 'Non-default value of visualization:dimmingOpacity' },
  },
  'visualization:tileMap:maxPrecision': {
    type: 'long',
    _meta: { description: 'Non-default value of visualization:tileMap' },
  },
  'csv:separator': {
    type: 'keyword',
    _meta: { description: 'Non-default value of csv:separator' },
  },
  'visualization:tileMap:WMSdefaults': {
    type: 'text',
    _meta: { description: 'Non-default value of visualization:tileMap' },
  },
  'timelion:target_buckets': {
    type: 'long',
    _meta: { description: 'Non-default value of timelion:target_buckets' },
  },
  'timelion:max_buckets': {
    type: 'long',
    _meta: { description: 'Non-default value of timelion:max_buckets' },
  },
  'timelion:es.timefield': {
    type: 'keyword',
    _meta: { description: 'Non-default value of timelion:es' },
  },
  'timelion:min_interval': {
    type: 'keyword',
    _meta: { description: 'Non-default value of timelion:min_interval' },
  },
  'timelion:default_rows': {
    type: 'long',
    _meta: { description: 'Non-default value of timelion:default_rows' },
  },
  'timelion:default_columns': {
    type: 'long',
    _meta: { description: 'Non-default value of timelion:default_columns' },
  },
  'timelion:es.default_index': {
    type: 'keyword',
    _meta: { description: 'Non-default value of timelion:es' },
  },
  'timelion:showTutorial': {
    type: 'boolean',
    _meta: { description: 'Non-default value of timelion:showTutorial' },
  },
  'securitySolution:timeDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of securitySolution:timeDefaults' },
  },
  'securitySolution:defaultAnomalyScore': {
    type: 'long',
    _meta: { description: 'Non-default value of securitySolution:defaultAnomalyScore' },
  },
  'securitySolution:refreshIntervalDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of securitySolution:refreshIntervalDefaults' },
  },
  'securitySolution:enableNewsFeed': {
    type: 'boolean',
    _meta: { description: 'Non-default value of securitySolution:enableNewsFeed' },
  },
  'search:includeFrozen': {
    type: 'boolean',
    _meta: { description: 'Non-default value of search:includeFrozen' },
  },
  'courier:maxConcurrentShardRequests': {
    type: 'long',
    _meta: { description: 'Non-default value of courier:maxConcurrentShardRequests' },
  },
  'courier:batchSearches': {
    type: 'boolean',
    _meta: { description: 'Non-default value of courier:batchSearches' },
  },
  'courier:setRequestPreference': {
    type: 'keyword',
    _meta: { description: 'Non-default value of courier:setRequestPreference' },
  },
  'courier:customRequestPreference': {
    type: 'keyword',
    _meta: { description: 'Non-default value of courier:customRequestPreference' },
  },
  'courier:ignoreFilterIfFieldNotInIndex': {
    type: 'boolean',
    _meta: { description: 'Non-default value of courier:ignoreFilterIfFieldNotInIndex' },
  },
  'rollups:enableIndexPatterns': {
    type: 'boolean',
    _meta: { description: 'Non-default value of rollups:enableIndexPatterns' },
  },
  'notifications:lifetime:warning': {
    type: 'long',
    _meta: { description: 'Non-default value of notifications:lifetime' },
  },
  'notifications:lifetime:banner': {
    type: 'long',
    _meta: { description: 'Non-default value of notifications:lifetime' },
  },
  'notifications:lifetime:info': {
    type: 'long',
    _meta: { description: 'Non-default value of notifications:lifetime' },
  },
  'notifications:lifetime:error': {
    type: 'long',
    _meta: { description: 'Non-default value of notifications:lifetime' },
  },
  'doc_table:highlight': {
    type: 'boolean',
    _meta: { description: 'Non-default value of doc_table:highlight' },
  },
  'discover:searchOnPageLoad': {
    type: 'boolean',
    _meta: { description: 'Non-default value of discover:searchOnPageLoad' },
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'doc_table:hideTimeColumn': {
    type: 'boolean',
    _meta: { description: 'Non-default value of doc_table:hideTimeColumn' },
  },
  'discover:sampleSize': {
    type: 'long',
    _meta: { description: 'Non-default value of discover:sampleSize' },
  },
  defaultColumns: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of defaultColumns item' },
    },
  },
  'context:defaultSize': {
    type: 'long',
    _meta: { description: 'Non-default value of context:defaultSize' },
  },
  'discover:aggs:terms:size': {
    type: 'long',
    _meta: { description: 'Non-default value of discover:aggs:terms:size' },
  },
  'context:tieBreakerFields': {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of context:tieBreakerFields item' },
    },
  },
  'discover:sort:defaultOrder': {
    type: 'keyword',
    _meta: { description: 'Non-default value of discover:sort:defaultOrder' },
  },
  'context:step': { type: 'long', _meta: { description: 'Non-default value of context:step' } },
  'accessibility:disableAnimations': {
    type: 'boolean',
    _meta: { description: 'Non-default value of accessibility:disableAnimations' },
  },
  'ml:fileDataVisualizerMaxFileSize': {
    type: 'keyword',
    _meta: { description: 'Non-default value of ml:fileDataVisualizerMaxFileSize' },
  },
  'ml:anomalyDetection:results:enableTimeDefaults': {
    type: 'boolean',
    _meta: { description: 'Non-default value of ml:anomalyDetection:enableTimeDefaults' },
  },
  'ml:anomalyDetection:results:timeDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of ml:anomalyDetection:timeDefaults' },
  },
  'truncate:maxHeight': {
    type: 'long',
    _meta: { description: 'Non-default value of truncate:maxHeight' },
  },
  'timepicker:timeDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of timepicker:timeDefaults' },
  },
  'timepicker:refreshIntervalDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of timepicker:refreshIntervalDefaults' },
  },
  'timepicker:quickRanges': {
    type: 'keyword',
    _meta: { description: 'Non-default value of timepicker:quickRanges' },
  },
  'theme:version': {
    type: 'keyword',
    _meta: { description: 'Non-default value of theme:version' },
  },
  'theme:darkMode': {
    type: 'boolean',
    _meta: { description: 'Non-default value of theme:darkMode' },
  },
  'state:storeInSessionStorage': {
    type: 'boolean',
    _meta: { description: 'Non-default value of state:storeInSessionStorage' },
  },
  'savedObjects:perPage': {
    type: 'long',
    _meta: { description: 'Non-default value of savedObjects:perPage' },
  },
  'search:queryLanguage': {
    type: 'keyword',
    _meta: { description: 'Non-default value of search:queryLanguage' },
  },
  'shortDots:enable': {
    type: 'boolean',
    _meta: { description: 'Non-default value of shortDots:enable' },
  },
  'sort:options': {
    type: 'keyword',
    _meta: { description: 'Non-default value of sort:options' },
  },
  'savedObjects:listingLimit': {
    type: 'long',
    _meta: { description: 'Non-default value of savedObjects:listingLimit' },
  },
  'query:queryString:options': {
    type: 'keyword',
    _meta: { description: 'Non-default value of query:queryString' },
  },
  'metrics:max_buckets': {
    type: 'long',
    _meta: { description: 'Non-default value of metrics:max_buckets' },
  },
  'query:allowLeadingWildcards': {
    type: 'boolean',
    _meta: { description: 'Non-default value of query:allowLeadingWildcards' },
  },
  metaFields: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of metaFields item' },
    },
  },
  'indexPattern:placeholder': {
    type: 'keyword',
    _meta: { description: 'Non-default value of indexPattern:placeholder' },
  },
  'histogram:barTarget': {
    type: 'long',
    _meta: { description: 'Non-default value of histogram:barTarget' },
  },
  'histogram:maxBars': {
    type: 'long',
    _meta: { description: 'Non-default value of histogram:maxBars' },
  },
  'format:number:defaultLocale': {
    type: 'keyword',
    _meta: { description: 'Non-default value of format:number:defaultLocale' },
  },
  'format:percent:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of format:percent:defaultPattern' },
  },
  'format:number:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of format:number:defaultPattern' },
  },
  'history:limit': { type: 'long', _meta: { description: 'Non-default value of history:limit' } },
  'format:defaultTypeMap': {
    type: 'keyword',
    _meta: { description: 'Non-default value of format:defaultTypeMap' },
  },
  'format:currency:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of format:currency:defaultPattern' },
  },
  defaultIndex: { type: 'keyword', _meta: { description: 'Non-default value of defaultIndex' } },
  'format:bytes:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of format:bytes:' },
  },
  'filters:pinnedByDefault': {
    type: 'boolean',
    _meta: { description: 'Non-default value of filters:pinnedByDefault' },
  },
  'filterEditor:suggestValues': {
    type: 'boolean',
    _meta: { description: 'Non-default value of filterEditor:suggestValues' },
  },
  'fields:popularLimit': {
    type: 'long',
    _meta: { description: 'Non-default value of fields:popularLimit' },
  },
  dateNanosFormat: {
    type: 'keyword',
    _meta: { description: 'Non-default value of dateNanosFormat' },
  },
  defaultRoute: { type: 'keyword', _meta: { description: 'Non-default value of defaultRoute' } },
  'dateFormat:tz': {
    type: 'keyword',
    _meta: { description: 'Non-default value of dateFormat:tz' },
  },
  'dateFormat:scaled': {
    type: 'keyword',
    _meta: { description: 'Non-default value of dateFormat:scaled' },
  },
  'csv:quoteValues': {
    type: 'boolean',
    _meta: { description: 'Non-default value of csv:quoteValues' },
  },
  'dateFormat:dow': {
    type: 'keyword',
    _meta: { description: 'Non-default value of dateFormat:dow' },
  },
  dateFormat: { type: 'keyword', _meta: { description: 'Non-default value of dateFormat' } },
  'autocomplete:useTimeRange': {
    type: 'boolean',
    _meta: { description: 'Non-default value of autocomplete:useTimeRange' },
  },
  'search:timeout': {
    type: 'long',
    _meta: { description: 'Non-default value of search:timeout' },
  },
  'visualization:visualize:legacyChartsLibrary': {
    type: 'boolean',
    _meta: { description: 'Non-default value of visualization:visualize:legacyChartsLibrary' },
  },
  'doc_table:legacy': {
    type: 'boolean',
    _meta: { description: 'Non-default value of doc_table:legacy' },
  },
  'discover:modifyColumnsOnSwitch': {
    type: 'boolean',
    _meta: { description: 'Non-default value of discover:modifyColumnsOnSwitch' },
  },
  'discover:searchFieldsFromSource': {
    type: 'boolean',
    _meta: { description: 'Non-default value of discover:searchFieldsFromSource' },
  },
  'securitySolution:rulesTableRefresh': {
    type: 'text',
    _meta: { description: 'Non-default value of securitySolution:rulesTableRefresh' },
  },
  'apm:enableSignificantTerms': {
    type: 'boolean',
    _meta: { description: 'Non-default value of apm:enableSignificantTerms' },
  },
  'apm:enableServiceOverview': {
    type: 'boolean',
    _meta: { description: 'Non-default value of apm:enableServiceOverview' },
  },
};
