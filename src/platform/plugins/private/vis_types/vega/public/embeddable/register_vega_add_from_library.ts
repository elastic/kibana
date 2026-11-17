/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { VEGA_EMBEDDABLE_TYPE, VEGA_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { VegaByReferenceState } from '../../server/embeddable/schema';
import { VegaIcon, vegaTitleInWizard } from '../vega_icon';

/** Lets dashboards add Vega library items as by-reference panels. */
export const registerVegaAddFromLibrary = (embeddable: EmbeddableSetup) =>
  embeddable.registerAddFromLibraryType({
    onAdd: (container, savedObject) => {
      container.addNewPanel<VegaByReferenceState>(
        { panelType: VEGA_EMBEDDABLE_TYPE, serializedState: { ref_id: savedObject.id } },
        { displaySuccessMessage: true }
      );
    },
    savedObjectType: VEGA_SAVED_OBJECT_TYPE,
    savedObjectName: vegaTitleInWizard,
    getIconForSavedObject: () => VegaIcon,
  });
