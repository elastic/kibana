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

export const textObjectTypeName = 'text-object';

/**
 * Describes the shape of persisted objects that contain information about the current text in the
 * text editor.
 */
export interface TextObject {
  /**
   * An ID that uniquely identifies this object.
   */
  id: string;

  /**
   * UNIX timestamp of when the object was created.
   */
  createdAt: number;

  /**
   * UNIX timestamp of when the object was last updated.
   */
  updatedAt: number;

  /**
   * Text value input by the user.
   *
   * Used to re-populate a text editor buffer.
   */
  text: string;

  /**
   * An optional user provided name for the text object
   */
  name?: string;

  /**
   * An indication of whether a text object is the scratch pad. This
   * object is special and there should only be one of them. The default
   * should be that the first ever created text object is the scratch pad
   * which cannot be renamed or deleted.
   */
  isScratchPad?: boolean;
}
