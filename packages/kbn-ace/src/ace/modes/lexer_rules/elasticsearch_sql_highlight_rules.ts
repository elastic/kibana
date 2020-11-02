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
import ace from 'brace';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');
const oop = ace.acequire('ace/lib/oop');

export const ElasticsearchSqlHighlightRules = function (this: any) {
  // See https://www.elastic.co/guide/en/elasticsearch/reference/current/sql-commands.html
  const keywords =
    'describe|between|in|like|not|and|or|desc|select|from|where|having|group|by|order' +
    'asc|desc|pivot|for|in|as|show|columns|include|frozen|tables|escape|limit|rlike|all|distinct|is';

  const builtinConstants = 'true|false';

  // See https://www.elastic.co/guide/en/elasticsearch/reference/current/sql-syntax-show-functions.html
  const builtinFunctions =
    'avg|count|first|first_value|last|last_value|max|min|sum|kurtosis|mad|percentile|percentile_rank|skewness' +
    '|stddev_pop|sum_of_squares|var_pop|histogram|case|coalesce|greatest|ifnull|iif|isnull|least|nullif|nvl' +
    '|curdate|current_date|current_time|current_timestamp|curtime|dateadd|datediff|datepart|datetrunc|date_add' +
    '|date_diff|date_part|date_trunc|day|dayname|dayofmonth|dayofweek|dayofyear|day_name|day_of_month|day_of_week' +
    '|day_of_year|dom|dow|doy|hour|hour_of_day|idow|isodayofweek|isodow|isoweek|isoweekofyear|iso_day_of_week|iso_week_of_year' +
    '|iw|iwoy|minute|minute_of_day|minute_of_hour|month|monthname|month_name|month_of_year|now|quarter|second|second_of_minute' +
    '|timestampadd|timestampdiff|timestamp_add|timestamp_diff|today|week|week_of_year|year|abs|acos|asin|atan|atan2|cbrt' +
    '|ceil|ceiling|cos|cosh|cot|degrees|e|exp|expm1|floor|log|log10|mod|pi|power|radians|rand|random|round|sign|signum|sin' +
    '|sinh|sqrt|tan|truncate|ascii|bit_length|char|character_length|char_length|concat|insert|lcase|left|length|locate' +
    '|ltrim|octet_length|position|repeat|replace|right|rtrim|space|substring|ucase|cast|convert|database|user|st_astext|st_aswkt' +
    '|st_distance|st_geometrytype|st_geomfromtext|st_wkttosql|st_x|st_y|st_z|score';

  // See https://www.elastic.co/guide/en/elasticsearch/reference/current/sql-data-types.html
  const dataTypes =
    'null|boolean|byte|short|integer|long|double|float|half_float|scaled_float|keyword|text|binary|date|ip|object|nested|time' +
    '|interval_year|interval_month|interval_day|interval_hour|interval_minute|interval_second|interval_year_to_month' +
    'inteval_day_to_hour|interval_day_to_minute|interval_day_to_second|interval_hour_to_minute|interval_hour_to_second' +
    'interval_minute_to_second|geo_point|geo_shape|shape';

  const keywordMapper = this.createKeywordMapper(
    {
      keyword: [keywords, builtinFunctions, builtinConstants, dataTypes].join('|'),
    },
    'identifier',
    true
  );

  this.$rules = {
    start: [
      {
        token: 'comment',
        regex: '--.*$',
      },
      {
        token: 'comment',
        start: '/\\*',
        end: '\\*/',
      },
      {
        token: 'string', // " string
        regex: '".*?"',
      },
      {
        token: 'constant', // ' string
        regex: "'.*?'",
      },
      {
        token: 'string', // ` string (apache drill)
        regex: '`.*?`',
      },
      {
        token: 'entity.name.function', // float
        regex: '[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b',
      },
      {
        token: keywordMapper,
        regex: '[a-zA-Z_$][a-zA-Z0-9_$]*\\b',
      },
      {
        token: 'keyword.operator',
        regex: '⇐|<⇒|\\*|\\.|\\:\\:|\\+|\\-|\\/|\\/\\/|%|&|\\^|~|<|>|<=|=>|==|!=|<>|=',
      },
      {
        token: 'paren.lparen',
        regex: '[\\(]',
      },
      {
        token: 'paren.rparen',
        regex: '[\\)]',
      },
      {
        token: 'text',
        regex: '\\s+',
      },
    ],
  };
  this.normalizeRules();
};

oop.inherits(ElasticsearchSqlHighlightRules, TextHighlightRules);
