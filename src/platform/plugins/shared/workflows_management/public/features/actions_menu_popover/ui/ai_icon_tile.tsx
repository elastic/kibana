/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { aiIconTileCss } from '@kbn/workflows-ui';

export { aiIconTileCss };

/** Sparkles glyph with the standard Kibana AI Primary → Assistance SVG gradient. */
export function ActionsMenuAiIcon(): JSX.Element {
  return <AiIcon iconType="sparkles" size="m" aria-hidden />;
}
