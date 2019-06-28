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

import { Readable, Transform, Writable, TransformOptions } from 'stream';

export function concatStreamProviders(
  sourceProviders: Readable[],
  options: TransformOptions
): Transform;
export function createIntersperseStream(intersperseChunk: string | Buffer): Transform;
export function createSplitStream<T>(splitChunk: T): Transform;
export function createListStream(items: any[]): Readable;
export function createReduceStream<T>(reducer: (value: any, chunk: T, enc: string) => T): Transform;
export function createPromiseFromStreams<T>([first, ...rest]: [Readable, ...Writable[]]): Promise<
  T
>;
export function createConcatStream(initial: any): Transform;
export function createMapStream<T>(fn: (value: T, i: number) => void): Transform;
export function createReplaceStream(toReplace: string, replacement: string | Buffer): Transform;
export function createFilterStream<T>(fn: (obj: T) => boolean): Transform;
