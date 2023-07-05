/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { LinkInput } from '../navigation_container/types';

export interface ExternalLinkInput extends LinkInput {
  url: string;
}

/**
 * TODO: There is currently no component state for external links;
 * It is possible that having redux state for this embeddable type is overkill, and we may be able to just
 * use basic `explicitInput` logic to grab the necessary information. However, we can fix that after-the-fact
 * just in case there is something that we want to add that I haven't yet considered
 */
export type ExternalLinkReduxState = ReduxEmbeddableState<ExternalLinkInput, EmbeddableOutput, {}>;
