/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { takeRight } from 'lodash';
import { StackFrameMetadata } from './profiling';

/** Frame group ID */
export type FrameGroupID = string;

function stripLeadingSubdirs(sourceFileName: string) {
  return takeRight(sourceFileName.split('/'), 2).join('/');
}

/**
 * A small map of strings that is used to assign certain "non-stable" functions to a generic
 * equivalent replacement string. This is necessary for things such as x64/ARM comparisons, because
 * the glibc root functions of all stack traces will end up in different files due to conditional
 * compilation of glibc dependent on CPU architecture.
 */
const equivalenceMap = new Map<string, string>([
  ['../sysdeps/unix/sysv/linux/x86_64/clone3.S:__clone3', 'thread_start'],
  ['../sysdeps/unix/sysv/linux/aarch64/clone.S:thread_start', 'thread_start'],
  // Insert more files/functions here: ['key3', 'value3'],
]);
/**
 *
 * createFrameGroupID is the "standard" way of grouping frames, by commonly shared group identifiers.
 * For ELF-symbolized frames, group by FunctionName, ExeFileName and FileID.
 * For non-symbolized frames, group by FileID and AddressOrLine.
 * otherwise group by ExeFileName, SourceFilename and FunctionName.
 *
 * There is special handling for a subset of functions that differ between different Linux builds;
 * mostly CPU-specific files in glibc and to some extent in the kernel. These are currently handled
 * by a hardcoded dictionary; it would be more elegant to move this dictionary to be an ES index
 * in the future.
 *
 * @param fileID string
 * @param addressOrLine string
 * @param exeFilename string
 * @param sourceFilename string
 * @param functionName string
 * @returns FrameGroupID
 */
export function createFrameGroupID(
  fileID: StackFrameMetadata['FileID'],
  addressOrLine: StackFrameMetadata['AddressOrLine'],
  exeFilename: StackFrameMetadata['ExeFileName'],
  sourceFilename: StackFrameMetadata['SourceFilename'],
  functionName: StackFrameMetadata['FunctionName']
): FrameGroupID {
  if (functionName === '') {
    return `empty;${fileID};${addressOrLine}`;
  }

  if (sourceFilename === '') {
    return `elf;${fileID};${functionName}`;
  }

  const key = `${sourceFilename}:${functionName}`
  if (equivalenceMap.has(key)) {
    const replacementString = equivalenceMap.get(key);
    return `full;kernel;${replacementString}`;
  }
  return `full;${exeFilename};${functionName};${stripLeadingSubdirs(sourceFilename || '')}`;
}
