/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import beta from './icons/beta.svg';
import bolt from './icons/bolt.svg';
import clock from './icons/clock.svg';
import database from './icons/database.svg';
import email from './icons/email.svg';
import fail from './icons/fail.svg';
import flask from './icons/flask.svg';
import glyph from './icons/glyph.svg';
import elasticsearchLogoSvg from './icons/logo_elasticsearch.svg';
import kibanaLogoSvg from './icons/logo_kibana.svg';
import output from './icons/output.svg';
import parallel from './icons/parallel.svg';
import plugs from './icons/plugs.svg';
import productStreamsWired from './icons/product_streams_wired.svg';
import sparkles from './icons/sparkles.svg';
import union from './icons/union.svg';
import user from './icons/user.svg';
import warning from './icons/warning.svg';

export const HardcodedIcons: Record<string, string> = {
  '.slack': 'logoSlack',
  '.slack_api': 'logoSlack',
  '.email': email,
  '.inference': sparkles,
  elasticsearch: elasticsearchLogoSvg,
  kibana: kibanaLogoSvg,
  console: 'commandLine',
  'data.set': database,
  foreach: 'refresh',
  while: 'refresh',
  switch: productStreamsWired,
  parallel,
  if: 'branch',
  wait: clock,
  waitForInput: user,
  waitForApproval: user,
  alert: warning,
  scheduled: clock,
  manual: user,
  'workflow.execute': glyph,
  'workflow.executeAsync': union,
  'workflow.output': output,
  'workflow.fail': fail,
  trigger: bolt,
  flask,
  beta,
  default: plugs,
};
