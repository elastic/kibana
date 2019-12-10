/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import 'ngreact';

import { uiModules } from 'ui/modules'; // eslint-disable-line
const module = uiModules.get('kibana', ['react']);

import AttachDownload from '../components/attach_download';

module.directive('attachDownload', function (reactDirective) {
  return reactDirective(AttachDownload,
    [
      'session',
      'fileName',
      'captured'
    ]);
});
