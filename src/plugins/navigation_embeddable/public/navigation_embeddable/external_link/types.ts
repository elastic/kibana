/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { LinkInput } from '../types';

export interface ExternalLinkInput extends LinkInput {
  url: string;
}

// export type ExternalinkDestination = ExternalLinkInput;

export interface ExternalLinkComponentState {
  deleteme?: boolean;
}

export type ExternalLinkReduxState = ReduxEmbeddableState<
  ExternalLinkInput,
  EmbeddableOutput,
  ExternalLinkComponentState
>;
