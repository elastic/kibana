/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApmUserAgentFields } from '../apm_fields';

export function getChromeUserAgentDefaults(): ApmUserAgentFields {
  return {
    'user_agent.original':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
    'user_agent.device.name': 'MacBook',
    'user_agent.name': 'Chrome',
    'user_agent.version': 95,
    'user_agent.os.name': 'MacOS',
  };
}
