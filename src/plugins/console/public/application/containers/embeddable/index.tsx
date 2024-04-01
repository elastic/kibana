/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import {
  EmbeddableConsoleProps,
  EmbeddableConsoleDependencies,
} from '../../../types/embeddable_console';

type EmbeddableConsoleInternalProps = EmbeddableConsoleProps & EmbeddableConsoleDependencies;
const Console = dynamic(async () => ({
  default: (await import('./embeddable_console')).EmbeddableConsole,
}));

export const EmbeddableConsole = (props: EmbeddableConsoleInternalProps) => <Console {...props} />;
