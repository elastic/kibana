/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerReactEmbeddableSavedObject } from '@kbn/embeddable-plugin/public';

const MY_EMBEDDABLE_TYPE = 'myEmbeddableType';
const MY_SAVED_OBJECT_TYPE = 'mySavedObjectType';
const APP_ICON = 'logoKibana';

export const registerMyEmbeddableSavedObject = () =>
  registerReactEmbeddableSavedObject({
    onAdd: (container, savedObject) => {
      container.addNewPanel({
        panelType: MY_EMBEDDABLE_TYPE,
        initialState: savedObject.attributes,
      });
    },
    embeddableType: MY_EMBEDDABLE_TYPE,
    savedObjectType: MY_SAVED_OBJECT_TYPE,
    savedObjectName: 'Some saved object',
    getIconForSavedObject: () => APP_ICON,
  });
