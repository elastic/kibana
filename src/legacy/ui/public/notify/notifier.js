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

import _ from 'lodash';
import { metadata } from '../metadata';
import { formatMsg, formatStack } from './lib';
import '../render_directive';
import { i18n } from '@kbn/i18n';

const notifs = [];

const { version, buildNum } = metadata;

function closeNotif(notif, cb = _.noop, key) {
  return function () {
    // this === notif
    const i = notifs.indexOf(notif);
    if (i !== -1) notifs.splice(i, 1);

    cancelTimer(notif);
    cb(key);
  };
}

function cancelTimer(notif) {
  if (notif.timerId) {
    Notifier.config.clearInterval(notif.timerId);
    notif.timerId = undefined;
  }
}

function timerCanceler(notif, cb = _.noop, key) {
  return function cancelNotifTimer() {
    cancelTimer(notif);
    cb(key);
  };
}

/**
 * Initiates a timer to update _timeRemaining_ on the notif at second
 * intervals and clears the notif once the notif _lifetime_ has been reached.
 */
function startNotifTimer(notif, cb) {
  const interval = 1000;

  if (notif.lifetime === Infinity || notif.lifetime === 0) {
    return;
  }

  notif.timeRemaining = Math.floor(notif.lifetime / interval);

  notif.timerId = Notifier.config.setInterval(
    function () {
      notif.timeRemaining -= 1;

      if (notif.timeRemaining <= 0) {
        closeNotif(notif, cb, 'ignore')();
      }
    },
    interval,
    notif.timeRemaining
  );

  notif.cancelTimer = timerCanceler(notif, cb);
}

function restartNotifTimer(notif, cb) {
  cancelTimer(notif);
  startNotifTimer(notif, cb);
}

const typeToButtonClassMap = {
  danger: 'kuiButton--danger', // NOTE: `error` type is internally named as `danger`
  info: 'kuiButton--secondary',
};
const typeToAlertClassMap = {
  danger: `kbnToast--danger`,
  info: `kbnToast--info`,
};

function add(notif, cb) {
  _.set(notif, 'info.version', version);
  _.set(notif, 'info.buildNum', buildNum);

  notif.clear = closeNotif(notif);

  if (notif.actions) {
    notif.actions.forEach(function (action) {
      notif[action] = closeNotif(notif, cb, action);
    });
  } else if (notif.customActions) {
    // wrap all of the custom functions in a close
    notif.customActions = notif.customActions.map((action) => {
      return {
        key: action.text,
        dataTestSubj: action.dataTestSubj,
        callback: closeNotif(notif, action.callback, action.text),
        getButtonClass() {
          const buttonTypeClass = typeToButtonClassMap[notif.type];
          return `${buttonTypeClass}`;
        },
      };
    });
  }

  notif.count = (notif.count || 0) + 1;

  notif.isTimed = function isTimed() {
    return notif.timerId ? true : false;
  };

  // decorate the notification with helper functions for the template
  notif.getButtonClass = () => `${typeToButtonClassMap[notif.type]}`;
  notif.getAlertClassStack = () => `kbnToast kbnToast-isStack ${typeToAlertClassMap[notif.type]}`;
  notif.getIconClass = () => `fa fa-${notif.icon}`;
  notif.getToastMessageClass = () => 'kbnToast__message';
  notif.getAlertClass = () => `kbnToast ${typeToAlertClassMap[notif.type]}`;
  notif.getButtonGroupClass = () => 'kbnToast__controls';

  let dup = null;
  if (notif.content) {
    dup = _.find(notifs, function (item) {
      return item.content === notif.content && item.lifetime === notif.lifetime;
    });
  }

  if (dup) {
    dup.count += 1;
    dup.stacks = _.union(dup.stacks, [notif.stack]);

    restartNotifTimer(dup, cb);

    return dup;
  }

  startNotifTimer(notif, cb);

  notif.stacks = [notif.stack];
  notifs.push(notif);
  return notif;
}

Notifier.prototype.add = add;

/**
 * Functionality to check that
 */
export function Notifier(opts) {
  const self = this;
  opts = opts || {};

  // label type thing to say where notifications came from
  self.from = opts.location;

  const notificationLevels = ['error'];

  notificationLevels.forEach(function (m) {
    self[m] = _.bind(self[m], self);
  });
}

Notifier.config = {
  bannerLifetime: 3000000,
  errorLifetime: 300000,
  infoLifetime: 5000,
  setInterval: window.setInterval,
  clearInterval: window.clearInterval,
};

Notifier.applyConfig = function (config) {
  _.merge(Notifier.config, config);
};

// simply a pointer to the global notif list
Notifier.prototype._notifs = notifs;

const overridableOptions = ['lifetime', 'icon'];

/**
 * Alert the user of an error that occured
 * @param  {Error|String} err
 * @param  {Function} cb
 */
Notifier.prototype.error = function (err, opts, cb) {
  if (_.isFunction(opts)) {
    cb = opts;
    opts = {};
  }

  const config = _.assign({
    type: 'danger',
    content: formatMsg(err, this.from),
    icon: 'warning',
    title: i18n.translate('common.ui.notify.toaster.errorTitle', {
      defaultMessage: 'Error',
    }),
    lifetime: Notifier.config.errorLifetime,
    actions: ['report', 'accept'],
    stack: formatStack(err)
  }, _.pick(opts, overridableOptions));

  return add(config, cb);
};
