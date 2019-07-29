"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiListingTableToolBar = KuiListingTableToolBar;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _ = require("../../");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
function KuiListingTableToolBar(_ref) {
  var pager = _ref.pager,
      actions = _ref.actions,
      onFilter = _ref.onFilter,
      filter = _ref.filter;
  var actionsSection;

  if (actions) {
    actionsSection = _react.default.createElement(_.KuiToolBarSection, null, actions);
  }

  var pagerSection;

  if (pager) {
    pagerSection = _react.default.createElement(_.KuiToolBarSection, null, pager);
  }

  return _react.default.createElement(_.KuiToolBar, null, _react.default.createElement(_.KuiToolBarSearchBox, {
    onFilter: onFilter,
    filter: filter
  }), actionsSection, pagerSection);
}

KuiListingTableToolBar.propTypes = {
  filter: _propTypes.default.string,
  onFilter: _propTypes.default.func.isRequired,
  pager: _propTypes.default.node,
  actions: _propTypes.default.node
};
