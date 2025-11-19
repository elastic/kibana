/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import branch from './branch.svg';
import clock from './clock.svg';
import console from './console.svg';
import email from './email.svg';
import globe from './globe.svg';
import elasticsearchLogoSvg from './logo_elasticsearch.svg';
import kibanaLogoSvg from './logo_kibana.svg';
import slackLogoSvg from './logo_slack.svg';
import plugs from './plugs.svg';
import refresh from './refresh.svg';
import sparkles from './sparkles.svg';
import user from './user.svg';
import warning from './warning.svg';

export const HARDCODED_ICONS: Record<string, string> = {
  '.slack': slackLogoSvg,
  '.slack_api': slackLogoSvg,
  '.email': email,
  '.inference': sparkles,
  elasticsearch: elasticsearchLogoSvg,
  kibana: kibanaLogoSvg,
  console,
  http: globe,
  foreach: refresh,
  if: branch,
  wait: clock,
  alert: warning,
  scheduled: clock,
  manual: user,
  default: plugs,
};
