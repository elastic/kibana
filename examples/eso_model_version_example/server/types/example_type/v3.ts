/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const EXAMPLE_SAVED_OBJECT_TYPE = 'eso_model_version_example';

// V3 adds an additional field 'flag2' to an AAD-included attribute
export interface EsoModelVersionExampleOptions1 {
  flag1?: boolean;
  flag2?: boolean;
}

export interface EsoModelVersionExampleOptions2 {
  foo?: string;
  bar?: string;
}

export interface EsoModelVersionExampleSecretData {
  a: string;
  b?: string;
}

// These are the attributes of V3 of our saved object.
export interface EsoModelVersionExample {
  name: string; // Display name attribute. Not part of AAD
  // We have removed 'toBeRemoved'
  aadField1?: EsoModelVersionExampleOptions1; // Optional attribute that is part of AAD.
  aadField2?: EsoModelVersionExampleOptions2; // Optional attribute that is part of AAD.
  aadExcludedField?: string; // Optional attribute that is NOT part of AAD.
  secrets: EsoModelVersionExampleSecretData; // An encrypted attribute.
}

// This is the encryption definition for V3 of our saved object.
// It is important to keep this definition so it can be used with the new
// createModelVersion wrapper when newer model versions are defined.
export const EsoModelVersionExampleTypeRegistration: EncryptedSavedObjectTypeRegistration = {
  type: EXAMPLE_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['secrets']),
  attributesToIncludeInAAD: new Set(['aadField1', 'aadField2']), // aadField1 and aadField2 are included in AAD, but not name, or aadExcludedField
};

// This is just some static information used to generate a document
// for this specific model version. Otherwise, creating a saved object
// will always create the latest model version.
//  secrets: {
//    a: 'this is a model version 3 object',
//    b: 'this property was added in model version 2',
//  }
export const ESO_MV_RAW_DOC = {
  index: '.kibana',
  id: 'eso_model_version_example:bb379c40-8618-4747-9ace-9bb27209e57f',
  document: {
    eso_model_version_example: {
      name: 'MV3 Test',
      aadField1: {
        flag1: false,
        flag2: true,
      },
      aadField2: {
        foo: 'theses were added in model version 2 and',
        bar: 'are now safe to use in model version 3',
      },
      aadExcludedField: 'this is a field excluded from AAD',
      secrets:
        'YQFEVfXtSDBWYjzzvFGC+LkReyAdDOFCyD9UoDdtL83HIFqH3VXb2TnankD4zaP0gralADCyuHOPohVmcBP5fYZ4mVW47aA1uDEP2ORHSGBXjUYNshiZ3+5JxDJRSmgIl0RD4mqAVNa7iQ7j2R+xvCyNG/OzFPw1hythAwv48JLUTXmOsvjJycqKqEkfhWbgvl4R2eZVHGAqsBZaB+J74E8KXGQXL7US+b+Xld/RUxTuhQqGlw==',
    },
    type: 'eso_model_version_example',
    references: [],
    managed: false,
    namespaces: ['default'],
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '10.3.0',
    updated_at: '2023-12-18T18:34:08.476Z',
    created_at: '2023-12-18T18:34:08.476Z',
  },
};
