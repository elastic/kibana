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

/* eslint import/no-unresolved: 0 */
const ace = require('brace');

ace.define('ace/theme/sense-dark', ['require', 'exports', 'module'],
  function (require, exports) {
    exports.isDark = true;
    exports.cssClass = 'ace-sense-dark';
    exports.cssText = '.ace-sense-dark .ace_gutter {\
background: #2e3236;\
color: #bbbfc2;\
}\
.ace-sense-dark .ace_print-margin {\
width: 1px;\
background: #555651\
}\
.ace-sense-dark .ace_scroller {\
background-color: #202328;\
}\
.ace-sense-dark .ace_content {\
}\
.ace-sense-dark .ace_text-layer {\
color: #F8F8F2\
}\
.ace-sense-dark .ace_cursor {\
border-left: 2px solid #F8F8F0\
}\
.ace-sense-dark .ace_overwrite-cursors .ace_cursor {\
border-left: 0px;\
border-bottom: 1px solid #F8F8F0\
}\
.ace-sense-dark .ace_marker-layer .ace_selection {\
background: #222\
}\
.ace-sense-dark.ace_multiselect .ace_selection.ace_start {\
box-shadow: 0 0 3px 0px #272822;\
border-radius: 2px\
}\
.ace-sense-dark .ace_marker-layer .ace_step {\
background: rgb(102, 82, 0)\
}\
.ace-sense-dark .ace_marker-layer .ace_bracket {\
margin: -1px 0 0 -1px;\
border: 1px solid #49483E\
}\
.ace-sense-dark .ace_marker-layer .ace_active-line {\
background: #202020\
}\
.ace-sense-dark .ace_gutter-active-line {\
background-color: #272727\
}\
.ace-sense-dark .ace_marker-layer .ace_selected-word {\
border: 1px solid #49483E\
}\
.ace-sense-dark .ace_invisible {\
color: #49483E\
}\
.ace-sense-dark .ace_entity.ace_name.ace_tag,\
.ace-sense-dark .ace_keyword,\
.ace-sense-dark .ace_meta,\
.ace-sense-dark .ace_storage {\
color: #F92672\
}\
.ace-sense-dark .ace_constant.ace_character,\
.ace-sense-dark .ace_constant.ace_language,\
.ace-sense-dark .ace_constant.ace_numeric,\
.ace-sense-dark .ace_constant.ace_other {\
color: #AE81FF\
}\
.ace-sense-dark .ace_invalid {\
color: #F8F8F0;\
background-color: #F92672\
}\
.ace-sense-dark .ace_invalid.ace_deprecated {\
color: #F8F8F0;\
background-color: #AE81FF\
}\
.ace-sense-dark .ace_support.ace_constant,\
.ace-sense-dark .ace_support.ace_function {\
color: #66D9EF\
}\
.ace-sense-dark .ace_fold {\
background-color: #A6E22E;\
border-color: #F8F8F2\
}\
.ace-sense-dark .ace_storage.ace_type,\
.ace-sense-dark .ace_support.ace_class,\
.ace-sense-dark .ace_support.ace_type {\
font-style: italic;\
color: #66D9EF\
}\
.ace-sense-dark .ace_entity.ace_name.ace_function,\
.ace-sense-dark .ace_entity.ace_other.ace_attribute-name,\
.ace-sense-dark .ace_variable {\
color: #A6E22E\
}\
.ace-sense-dark .ace_variable.ace_parameter {\
font-style: italic;\
color: #FD971F\
}\
.ace-sense-dark .ace_string {\
color: #E6DB74\
}\
.ace-sense-dark .ace_comment {\
color: #629755\
}\
.ace-sense-dark .ace_markup.ace_underline {\
text-decoration: underline\
}\
.ace-sense-dark .ace_indent-guide {\
background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNQ11D6z7Bq1ar/ABCKBG6g04U2AAAAAElFTkSuQmCC) right repeat-y\
}';

    const dom = require('ace/lib/dom');
    dom.importCssString(exports.cssText, exports.cssClass);
  });

