/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import bolt from './icons/bolt.svg';
import branch from './icons/branch.svg';
import clock from './icons/clock.svg';
import console from './icons/console.svg';
import email from './icons/email.svg';
import globe from './icons/globe.svg';
import elasticsearchLogoSvg from './icons/logo_elasticsearch.svg';
import kibanaLogoSvg from './icons/logo_kibana.svg';
import slackLogoSvg from './icons/logo_slack.svg';
import plugs from './icons/plugs.svg';
import refresh from './icons/refresh.svg';
import sparkles from './icons/sparkles.svg';
import tableOfContents from './icons/table_of_contents.svg';
import user from './icons/user.svg';
import warning from './icons/warning.svg';

export const HardcodedIcons: Record<string, string> = {
  '.slack': slackLogoSvg,
  '.slack_api': slackLogoSvg,
  '.email': email,
  '.inference': sparkles,
  elasticsearch: elasticsearchLogoSvg,
  kibana: kibanaLogoSvg,
  console,
  http: globe,
  'data.set': tableOfContents,
  foreach: refresh,
  if: branch,
  wait: clock,
  alert: warning,
  scheduled: clock,
  manual: user,
  trigger: bolt,
  default: plugs,
};
