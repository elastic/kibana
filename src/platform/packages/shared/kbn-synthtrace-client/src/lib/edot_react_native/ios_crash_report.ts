/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import { pick } from '../edot_shared/random';

/*
 * EDOT iOS writes `exception.stacktrace` as an excerpt of the PLCrashReporter 1.12.2 text report
 * (`CrashReportExcerpt.compose`), at most 7,500 characters long: the header, the uncaught
 * exception, the crashed thread, as many other threads as still fit and the binary images their
 * frames point into. The register state is left out. PLCrashReporter runs without
 * symbolication, so frames only have their image and offset.
 */

const MAX_EXCERPT_LENGTH = 7_500;
const PAGE_SIZE = 0x4000;
const IMAGE_NAME_WIDTH = 35;
const ADDRESS_COLUMN_WIDTH = 18;

interface BinaryImage {
  name: string;
  base: number;
  size: number;
  arch: string;
  path: string;
  uuid: string;
  isMain: boolean;
}

interface SystemImage {
  name: string;
  base: number;
  size: number;
  path: string;
}

// System libraries at their shared-cache addresses before the launch's slide
const SYSTEM_IMAGES: readonly SystemImage[] = [
  { name: 'libobjc.A.dylib', base: 0x1938f0000, size: 0x50000, path: '/usr/lib/libobjc.A.dylib' },
  {
    name: 'CoreFoundation',
    base: 0x19b5a8000,
    size: 0x54c000,
    path: '/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation',
  },
  {
    name: 'Foundation',
    base: 0x199e3c000,
    size: 0xa8c000,
    path: '/System/Library/Frameworks/Foundation.framework/Foundation',
  },
  {
    name: 'UIKitCore',
    base: 0x19d6e4000,
    size: 0x1d8c000,
    path: '/System/Library/PrivateFrameworks/UIKitCore.framework/UIKitCore',
  },
  {
    name: 'libdispatch.dylib',
    base: 0x1a3954000,
    size: 0x48000,
    path: '/usr/lib/system/libdispatch.dylib',
  },
  {
    name: 'libsystem_c.dylib',
    base: 0x1a3b10000,
    size: 0x80000,
    path: '/usr/lib/system/libsystem_c.dylib',
  },
  { name: 'dyld', base: 0x1bab4c000, size: 0x88000, path: '/usr/lib/dyld' },
  {
    name: 'GraphicsServices',
    base: 0x1e0a8c000,
    size: 0xc000,
    path: '/System/Library/PrivateFrameworks/GraphicsServices.framework/GraphicsServices',
  },
  { name: 'libc++abi.dylib', base: 0x1e8e7c000, size: 0x1c000, path: '/usr/lib/libc++abi.dylib' },
  {
    name: 'libsystem_kernel.dylib',
    base: 0x1e8f04000,
    size: 0x3c000,
    path: '/usr/lib/system/libsystem_kernel.dylib',
  },
  {
    name: 'libsystem_pthread.dylib',
    base: 0x221c3c000,
    size: 0xc000,
    path: '/usr/lib/system/libsystem_pthread.dylib',
  },
];

// Stand-ins for the app's executable and the Hermes framework in the thread templates
const APP = '<app>';
const HERMES = 'hermes';
const KERNEL = 'libsystem_kernel.dylib';
const PTHREAD = 'libsystem_pthread.dylib';
const CF = 'CoreFoundation';

const RUN_LOOP = [KERNEL, KERNEL, KERNEL, KERNEL, CF, CF, CF];
const MAIN_THREAD = [...RUN_LOOP, 'GraphicsServices', 'UIKitCore', 'UIKitCore', APP, 'dyld'];
const WORK_QUEUE_THREAD = [KERNEL, PTHREAD];
const EVENT_FETCH_THREAD = [...RUN_LOOP, 'Foundation', 'Foundation', 'UIKitCore', 'Foundation'];
const JS_THREAD = [...RUN_LOOP, 'Foundation', APP, 'Foundation', PTHREAD, PTHREAD];
const HERMES_THREAD = [KERNEL, PTHREAD, HERMES, HERMES, PTHREAD, PTHREAD];
const JS_THREAD_INDEX = 7;

// The threads of an idle React Native app, by thread number
const IDLE_THREADS: readonly (readonly string[])[] = [
  MAIN_THREAD,
  WORK_QUEUE_THREAD,
  WORK_QUEUE_THREAD,
  WORK_QUEUE_THREAD,
  [...EVENT_FETCH_THREAD, PTHREAD, PTHREAD],
  WORK_QUEUE_THREAD,
  HERMES_THREAD,
  JS_THREAD,
  WORK_QUEUE_THREAD,
];

interface CrashedThread {
  index: number;
  frames: readonly string[];
  /** The backtrace of the uncaught exception that aborts the app, if it is one. */
  exceptionFrames?: readonly string[];
}

const DISPATCH_TO_MAIN = ['libdispatch.dylib', 'libdispatch.dylib', 'libdispatch.dylib'];

// Where each signal comes from in a React Native app
const crashedThreadOf = (signal: string): CrashedThread => {
  switch (signal) {
    // RCTFatal throws an NSException for a fatal JS error, and the uncaught exception aborts
    case 'SIGABRT':
      return {
        index: 0,
        frames: [
          KERNEL,
          PTHREAD,
          'libsystem_c.dylib',
          'libc++abi.dylib',
          'libc++abi.dylib',
          'libobjc.A.dylib',
          'libc++abi.dylib',
          'libc++abi.dylib',
          'libobjc.A.dylib',
          APP,
          APP,
          ...DISPATCH_TO_MAIN,
          ...MAIN_THREAD.slice(4),
        ],
        exceptionFrames: [
          CF,
          'libobjc.A.dylib',
          APP,
          APP,
          APP,
          ...DISPATCH_TO_MAIN,
          ...MAIN_THREAD.slice(4),
        ],
      };
    // A Swift runtime trap in native code of the app
    case 'SIGTRAP':
      return {
        index: 0,
        frames: [APP, APP, APP, 'UIKitCore', 'UIKitCore', 'UIKitCore', ...MAIN_THREAD.slice(4)],
      };
    // A bad memory access in the JS engine
    default:
      return {
        index: JS_THREAD_INDEX,
        frames: [HERMES, HERMES, HERMES, HERMES, HERMES, APP, APP, ...JS_THREAD.slice(4)],
      };
  }
};

const JS_ERRORS = [
  "TypeError: Cannot read property 'id' of undefined",
  'TypeError: undefined is not a function',
  'Error: Rendered more hooks than during the previous render.',
];
const JS_FUNCTIONS = ['onPress', 'renderItem', 'anonymous', 'commitHookEffectListMount'];

// A stable 128-bit hex digest, like the UUIDs of binary images
const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex').slice(0, 32);

const hex = (value: number): string => `0x${value.toString(16)}`;

/** An address within an image, the same for the same frame of the same thread template. */
const offsetIn = (image: BinaryImage, key: string): number => {
  const offset = parseInt(digest(key).slice(0, 8), 16) % (image.size - 0x100);
  // ARM64 instructions are 4 bytes long
  return offset - (offset % 4);
};

const formatDate = (time: number): string =>
  `${new Date(time).toISOString().slice(0, 19).replace('T', ' ')} +0000`;

const toUuid = (hash: string): string =>
  [hash.slice(0, 8), hash.slice(8, 12), hash.slice(12, 16), hash.slice(16, 20), hash.slice(20, 32)]
    .join('-')
    .toUpperCase();

export interface IosCrashReportOptions {
  signal: string;
  code: string;
  crashedAt: number;
  /** `CFBundleExecutable`. */
  executable: string;
  /** `CFBundleIdentifier`. */
  appId: string;
  serviceVersion: string;
  buildNumber: string;
  /** `hw.machine`, e.g. `iPhone16,1`. */
  hardwareModel: string;
  osVersion: string;
  osBuild: string;
  installationId: string;
  random: () => number;
}

export interface IosCrashReport {
  /** The signal's address: the faulting address of bad memory accesses, the crashing PC else. */
  address: number;
  /** The excerpt of the report that EDOT iOS writes as `exception.stacktrace`. */
  excerpt: string;
}

/** A crash report as PLCrashReporter writes it and EDOT iOS cuts it down. */
export const iosCrashReport = ({
  signal,
  code,
  crashedAt,
  executable,
  appId,
  serviceVersion,
  buildNumber,
  hardwareModel,
  osVersion,
  osBuild,
  installationId,
  random,
}: IosCrashReportOptions): IosCrashReport => {
  // The app's container stays the same for an installation
  const bundlePath = `/private/var/containers/Bundle/Application/${toUuid(
    digest(installationId)
  )}/${executable}.app`;
  const sharedCacheSlide = Math.floor(random() * 0x1000) * PAGE_SIZE;
  const appBase = 0x100000000 + Math.floor(random() * 0x1000) * PAGE_SIZE;
  const appSize = 0x2a80000;
  const images: Record<string, BinaryImage> = {
    [APP]: {
      name: executable,
      base: appBase,
      size: appSize,
      arch: 'arm64',
      path: `${bundlePath}/${executable}`,
      uuid: digest(`${appId}:${serviceVersion}:${buildNumber}`),
      isMain: true,
    },
    [HERMES]: {
      name: HERMES,
      base: appBase + appSize + Math.floor(random() * 0x100) * PAGE_SIZE,
      size: 0x400000,
      arch: 'arm64',
      path: `${bundlePath}/Frameworks/hermes.framework/hermes`,
      uuid: digest(`hermes:${appId}:${buildNumber}`),
      isMain: false,
    },
    ...Object.fromEntries(
      SYSTEM_IMAGES.map(({ name, base, size, path }) => [
        name,
        {
          name,
          base: base + sharedCacheSlide,
          size,
          arch: 'arm64e',
          path,
          uuid: digest(`${name}:${osBuild}`),
          isMain: false,
        },
      ])
    ),
  };

  const usedImages = new Set<BinaryImage>();
  const framePc = (imageKey: string, key: string) => {
    const image = images[imageKey];
    return { image, pc: image.base + offsetIn(image, key) };
  };
  const renderFrames = (frames: readonly string[], template: string): string[] =>
    frames.map((imageKey, i) => {
      const { image, pc } = framePc(imageKey, `${template}:${i}`);
      return `${String(i).padEnd(4)}${image.name.padEnd(IMAGE_NAME_WIDTH)} 0x${pc
        .toString(16)
        .padStart(16, '0')} ${hex(image.base)} + ${pc - image.base}`;
    });
  const imagesOf = (frames: readonly string[]) => frames.map((imageKey) => images[imageKey]);

  const crashed = crashedThreadOf(signal);
  const crashPc = framePc(crashed.frames[0], `${signal}:0`).pc;
  const address =
    signal === 'SIGSEGV'
      ? Math.floor(random() * 0x200) * 8
      : signal === 'SIGBUS'
      ? images[HERMES].base + Math.floor(random() * 0x100000) * 8
      : crashPc;

  const header = [
    `Incident Identifier: ${toUuid(digest(`${installationId}:${crashedAt}`))}`,
    `Hardware Model:      ${hardwareModel}`,
    `Process:         ${executable} [${100 + Math.floor(random() * 9_900)}]`,
    `Path:            ${bundlePath}/${executable}`,
    `Identifier:      ${appId}`,
    `Version:         ${serviceVersion} (${buildNumber})`,
    'Code Type:       ARM-64',
    'Parent Process:  launchd [1]',
    '',
    `Date/Time:       ${formatDate(crashedAt)}`,
    `OS Version:      iPhone OS ${osVersion} (${osBuild})`,
    'Report Version:  104',
    '',
    `Exception Type:  ${signal}`,
    `Exception Codes: ${code} at ${hex(address)}`,
    `Crashed Thread:  ${crashed.index}`,
  ].join('\n');

  const sections = [header];
  if (crashed.exceptionFrames) {
    const jsError = pick(random, JS_ERRORS);
    const jsStack = Array.from(
      { length: 3 },
      () => `${pick(random, JS_FUNCTIONS)}@1:${Math.floor(random() * 900_000)}`
    ).join('\n');
    sections.push(
      [
        'Application Specific Information:',
        `*** Terminating app due to uncaught exception 'RCTFatalException: Unhandled JS Exception: ${jsError}', reason: 'Unhandled JS Exception: ${jsError}, stack:\n${jsStack}'`,
      ].join('\n'),
      [
        'Last Exception Backtrace:',
        ...renderFrames(crashed.exceptionFrames, `${signal}:exception`),
      ].join('\n')
    );
    imagesOf(crashed.exceptionFrames).forEach((image) => usedImages.add(image));
  }
  sections.push(
    [`Thread ${crashed.index} Crashed:`, ...renderFrames(crashed.frames, signal)].join('\n')
  );
  imagesOf(crashed.frames).forEach((image) => usedImages.add(image));

  const renderImages = (used: ReadonlySet<BinaryImage>) =>
    [
      'Binary Images:',
      ...[...used]
        .sort((a, b) => a.base - b.base)
        .map(
          ({ name, base, size, arch, path, uuid, isMain }) =>
            `${hex(base).padStart(ADDRESS_COLUMN_WIDTH)} - ${hex(base + size - 1).padStart(
              ADDRESS_COLUMN_WIDTH
            )} ${isMain ? '+' : ' '}${name} ${arch}  <${uuid}> ${path}`
        ),
    ].join('\n');
  const compose = (parts: string[], used: ReadonlySet<BinaryImage>) =>
    `${[...parts, renderImages(used)].join('\n\n')}\n`;

  // The other threads in order, as long as they fit with the images they add
  for (const [index, frames] of IDLE_THREADS.entries()) {
    if (index === crashed.index) {
      continue;
    }
    const thread = [`Thread ${index}:`, ...renderFrames(frames, `idle:${index}`)].join('\n');
    const used = new Set([...usedImages, ...imagesOf(frames)]);
    if (compose([...sections, thread], used).length > MAX_EXCERPT_LENGTH) {
      break;
    }
    sections.push(thread);
    used.forEach((image) => usedImages.add(image));
  }

  return { address, excerpt: compose(sections, usedImages).slice(0, MAX_EXCERPT_LENGTH) };
};
