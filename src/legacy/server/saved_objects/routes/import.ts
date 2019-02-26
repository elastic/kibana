/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Boom from 'boom';
import Hapi from 'hapi';
import Joi from 'joi';
import { Readable } from 'stream';
import { Transform } from 'stream';
import {
  createConcatStream,
  createMapStream,
  createPromiseFromStreams,
  createSplitStream,
} from '../../../utils/streams';
import { SavedObject, SavedObjectsClient } from '../service';
import { Prerequisites } from './types';

interface TypeAndIdPair {
  type: string;
  id: string;
}

interface ImportRequest extends Hapi.Request {
  pre: {
    savedObjectsClient: SavedObjectsClient;
  };
  payload: {
    file: Readable;
    overwrite: boolean | TypeAndIdPair[];
    skip: TypeAndIdPair[];
  };
}

export const createImportRoute = (prereqs: Prerequisites) => ({
  path: '/api/saved_objects/_import',
  method: 'POST',
  config: {
    pre: [prereqs.getSavedObjectsClient],
    payload: {
      output: 'stream',
      allow: 'multipart/form-data',
    },
    validate: {
      payload: Joi.object({
        overwrite: Joi.alternatives([
          Joi.boolean(),
          Joi.array().items(
            Joi.object({
              type: Joi.string().required(),
              id: Joi.string().required(),
            })
          ),
        ]).default(false),
        skip: Joi.array()
          .items(
            Joi.object({
              type: Joi.string().required(),
              id: Joi.string().required(),
            })
          )
          .default([]),
        file: Joi.object().required(),
      }),
    },
  },
  async handler(request: ImportRequest) {
    const { savedObjectsClient } = request.pre;
    const readStream = request.payload.file;
    const objectsToImport = (await createPromiseFromStreams([
      readStream,
      createSplitStream('\n'),
      createMapStream((str: string) => {
        if (str && str !== '') {
          return JSON.parse(str);
        }
      }),
      createFilterStream(obj => !!obj),
      createLimitStream(request.server.config().get('savedObjects.maxImportExportSize')),
      createConcatStream([]),
    ])) as SavedObject[];

    // Split objects between ones we'll overwrite and ones we won't
    const [objectsToOverwrite, objectsToNotOverwrite] = objectsToImport.reduce(
      ([overwrite, dontOverwrite], obj) => {
        if (
          request.payload.skip.some(skipObj => skipObj.type === obj.type && skipObj.id === obj.id)
        ) {
          return [overwrite, dontOverwrite];
        }
        if (
          request.payload.overwrite === true ||
          (Array.isArray(request.payload.overwrite) &&
            request.payload.overwrite.some(
              overwriteObj => overwriteObj.type === obj.type && overwriteObj.id === obj.id
            ))
        ) {
          overwrite.push(obj);
        } else {
          dontOverwrite.push(obj);
        }
        return [overwrite, dontOverwrite];
      },
      [[] as SavedObject[], [] as SavedObject[]]
    );

    // Overwrite objects
    if (objectsToOverwrite.length) {
      await savedObjectsClient.bulkCreate(objectsToOverwrite, { overwrite: true });
    }

    // Create other objects, detect collisions
    if (objectsToNotOverwrite.length) {
      const bulkCreateResult = await savedObjectsClient.bulkCreate(objectsToNotOverwrite);
      const failedObjects = bulkCreateResult.saved_objects.filter(obj => !!obj.error);
      if (failedObjects.length) {
        const err = Boom.conflict();
        // Boom's method to add data to the error
        err.output.payload.attributes = {
          objects: failedObjects.map(obj => ({ id: obj.id, type: obj.type })),
        };
        throw err;
      }
    }

    return { success: true };
  },
});

function createLimitStream(limit: number) {
  let counter = 0;
  return new Transform({
    objectMode: true,
    async transform(obj, enc, done) {
      if (counter >= limit) {
        return done(new Error(`Can't import more than ${limit} objects`));
      }
      counter++;
      return done(undefined, obj);
    },
  });
}

function createFilterStream(fn: (obj: SavedObject) => boolean) {
  return new Transform({
    objectMode: true,
    async transform(obj, enc, done) {
      const canPushDownStream = fn(obj);
      if (canPushDownStream) {
        this.push(obj);
      }
      done();
    },
    async writev(chunks, done) {
      chunks
        .map(({ chunk: record }) => record)
        .filter(fn)
        .forEach((obj: SavedObject) => {
          this.push(obj);
        });
      done();
    },
  });
}
