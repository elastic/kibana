/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { FilesClient, FilesClientFactory } from './types';
import { FileKindsRegistryImpl } from '../common/file_kinds_registry';
import { createFilesClient } from './files_client';
import { FileKindBrowser } from '../common';
import { ScopedFilesClient } from '.';
import * as DefaultImageFileKind from '../common/default_image_file_kind';

/**
 * Public setup-phase contract
 */
export interface FilesSetup {
  /**
   * A factory for creating an {@link FilesClient} instance. This requires a
   * registered {@link FileKindBrowser}.
   *
   * @track-adoption
   */
  filesClientFactory: FilesClientFactory;

  /**
   * Register a {@link FileKind} which allows for specifying details about the files
   * that will be uploaded.
   *
   * @param {FileKind} fileKind - the file kind to register
   */
  registerFileKind(fileKind: FileKindBrowser): void;
}

export type FilesStart = Pick<FilesSetup, 'filesClientFactory'> & {
  getFileKindDefinition: (id: string) => FileKindBrowser;
  getAllFindKindDefinitions: () => FileKindBrowser[];
};

/**
 * Bringing files to Kibana
 */
export class FilesPlugin implements Plugin<FilesSetup, FilesStart> {
  private registry = new FileKindsRegistryImpl<FileKindBrowser>();
  private filesClientFactory?: FilesClientFactory;

  setup(core: CoreSetup): FilesSetup {
    this.registry.register({
      ...DefaultImageFileKind.kind,
      maxSizeBytes: DefaultImageFileKind.maxSize,
    });

    this.filesClientFactory = {
      asScoped: <M = unknown>(fileKind: string) => {
        return createFilesClient({
          registry: this.registry,
          fileKind,
          http: core.http,
        }) as ScopedFilesClient<M>;
      },
      asUnscoped: <M>() => {
        return createFilesClient({
          registry: this.registry,
          http: core.http,
        }) as FilesClient<M>;
      },
    };

    return {
      filesClientFactory: this.filesClientFactory,
      registerFileKind: (fileKind: FileKindBrowser) => {
        this.registry.register(fileKind);
      },
    };
  }

  start(core: CoreStart): FilesStart {
    return {
      filesClientFactory: this.filesClientFactory!,
      getFileKindDefinition: (id: string): FileKindBrowser => {
        return this.registry.get(id);
      },
      getAllFindKindDefinitions: (): FileKindBrowser[] => {
        return this.registry.getAll();
      },
    };
  }
}
