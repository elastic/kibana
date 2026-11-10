/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import { registerVegaAddFromLibrary } from '../embeddable/register_vega_add_from_library';
import { getVegaLibraryVisTypeAlias } from '../vega_library_vis_type_alias';

interface RegisterVegaLibraryParams {
  visualizations: VisualizationsSetup;
  embeddable: EmbeddableSetup;
  openLibraryEditor: (id: string) => Promise<void>;
}

/** Lists Vega library items in Visualize and offers them to dashboards. Loaded lazily so the plugin entry stays small. */
export const registerVegaLibrary = ({
  visualizations,
  embeddable,
  openLibraryEditor,
}: RegisterVegaLibraryParams) => {
  visualizations.registerAlias(getVegaLibraryVisTypeAlias(openLibraryEditor));
  registerVegaAddFromLibrary(embeddable);
};
