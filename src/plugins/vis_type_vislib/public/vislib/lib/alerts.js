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

import $ from 'jquery';
import _ from 'lodash';

/**
 * Adds alerts that float in front of a visualization
 *
 * @class Alerts
 * @constructor
 * @param el {HTMLElement} Reference to DOM element
 */
export class Alerts {
  constructor(vis, alertDefs) {
    this.vis = vis;
    this.data = vis.data;
    this.alertDefs = _.cloneDeep(alertDefs);

    this.alerts = _(alertDefs)
      .map((alertDef) => {
        if (!alertDef) return;
        if (alertDef.test && !alertDef.test(vis, this.data)) return;
        return this._addAlert(alertDef);
      })
      .compact();
  }

  _addAlert(alertDef) {
    const type = alertDef.type || 'info';
    const icon = alertDef.icon || type;
    const msg = alertDef.msg;
    // alert container
    const $icon = $('<i>').addClass('visAlerts__icon fa fa-' + icon);
    const $text = $('<p>').addClass('visAlerts__text').text(msg);
    const $closeIcon = $('<i>').addClass('fa fa-close');
    const $closeDiv = $('<div>').addClass('visAlerts__close').append($closeIcon);

    const $alert = $('<div>')
      .addClass('visAlert visAlert--' + type)
      .append([$icon, $text, $closeDiv]);
    $closeDiv.on('click', () => {
      $alert.remove();
    });

    return $alert;
  }

  // renders initial alerts
  render() {
    const alerts = this.alerts;
    const vis = this.vis;

    $(vis.element).find('.visWrapper__alerts').append($('<div>').addClass('visAlerts__tray'));
    if (!alerts.size()) return;
    $(vis.element).find('.visAlerts__tray').append(alerts.value());
  }

  // shows new alert
  show(msg, type) {
    const vis = this.vis;
    const alert = {
      msg: msg,
      type: type,
    };
    if (this.alertDefs.find((alertDef) => alertDef.msg === alert.msg)) return;
    this.alertDefs.push(alert);
    $(vis.element).find('.visAlerts__tray').append(this._addAlert(alert));
  }

  destroy() {
    $(this.vis.element).find('.visWrapper__alerts').remove();
  }
}
