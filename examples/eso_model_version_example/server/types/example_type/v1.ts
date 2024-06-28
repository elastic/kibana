/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const EXAMPLE_SAVED_OBJECT_TYPE = 'eso_model_version_example';

export interface EsoModelVersionExampleOptions1 {
  flag1?: boolean;
}

export interface EsoModelVersionExampleSecretData {
  a: string;
}

// These are the attributes of V1 of our saved object.
export interface EsoModelVersionExample {
  name: string; // Display name attribute. Not part of AAD
  toBeRemoved: string; // An attribute that will be removed in a later model version.
  aadField1?: EsoModelVersionExampleOptions1; // Optional attribute that is part of AAD.
  secrets: EsoModelVersionExampleSecretData; // An encrypted attribute.
}

// This is the encryption definition for V1 of our saved object.
// It is important to keep this definition so it can be used with the new
// createModelVersion wrapper when newer model versions are defined.
export const EsoModelVersionExampleTypeRegistration: EncryptedSavedObjectTypeRegistration = {
  type: EXAMPLE_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set(['aadField1']), // aadField1 is included in AAD, but not name or toBeRemoved
};

// This is just some static information used to generate a document
// for this specific model version. Otherwise, creating a saved object
// will always create the latest model version.
export const ESO_MV_RAW_DOC = {
  index: '.kibana',
  id: 'eso_model_version_example:9e2c00d0-7dc4-11ee-b7ba-ede5fa1a84d7',
  document: {
    eso_model_version_example: {
      name: 'MV1 Test',
      toBeRemoved: 'nope',
      aadField1: {
        flag1: false,
      },
      secrets:
        'SItM+8gR71K5LSmy2dX7EmwZUcDiZWAaI667qFZ22Cn6PtncjMuCMI9586IVt0X69ROV/q81J1XBNp71JpC+hVBZQjis1M17iYerot53srZbG2uw5j8onBiTdr30EgoWx2YFca0+Plm23ukiSdpZH0FSSQJ3npjN5HFumzG9eseNzET3',
    },
    type: 'eso_model_version_example',
    references: [],
    managed: false,
    namespaces: ['default'],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.1.0',
    updated_at: '2023-11-07T23:23:11.581Z',
    created_at: '2023-11-07T23:23:11.581Z',
  },
};
