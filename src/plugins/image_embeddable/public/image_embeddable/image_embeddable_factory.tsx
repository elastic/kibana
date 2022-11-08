/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
  ApplicationStart,
  OverlayStart,
  FilesClient,
  FileImageMetadata,
} from '../imports';
import { ImageEmbeddable, IMAGE_EMBEDDABLE_TYPE } from './image_embeddable';
import { ImageConfig } from '../types';
import { imageEmbeddableFileKind } from '../../common';

export interface ImageEmbeddableFactoryDeps {
  start: () => {
    application: ApplicationStart;
    overlays: OverlayStart;
    files: FilesClient<FileImageMetadata>;
  };
}

export interface ImageEmbeddableInput extends EmbeddableInput {
  imageConfig: ImageConfig;
}

export class ImageEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<ImageEmbeddableInput>
{
  public readonly type = IMAGE_EMBEDDABLE_TYPE;

  constructor(private deps: ImageEmbeddableFactoryDeps) {}

  public async isEditable() {
    return Boolean(this.deps.start().application.capabilities.dashboard?.showWriteControls);
  }

  public async create(initialInput: ImageEmbeddableInput, parent?: IContainer) {
    return new ImageEmbeddable(
      {
        getImageDownloadHref: (fileId) =>
          this.deps
            .start()
            .files.getDownloadHref({ id: fileId, fileKind: imageEmbeddableFileKind.id }),
      },
      initialInput,
      parent
    );
  }

  public getDisplayName() {
    return i18n.translate('xpack.imageEmbeddable.imageEmbeddableFactory.displayName', {
      defaultMessage: 'Image',
    });
  }

  public getIconType() {
    return `image`;
  }

  public async getExplicitInput(initialInput: ImageEmbeddableInput) {
    const { configureImage } = await import('../image_editor');

    const imageConfig = await configureImage(
      {
        files: this.deps.start().files,
        overlays: this.deps.start().overlays,
        currentAppId$: this.deps.start().application.currentAppId$,
      },
      initialInput ? initialInput.imageConfig : undefined
    );

    return { imageConfig };
  }

  public extract(state: EmbeddableStateWithType) {
    debugger;
    const imageEmbeddableInput = state as unknown as ImageEmbeddableInput;
    const references: SavedObjectReference[] = [];
    if (imageEmbeddableInput.imageConfig?.src?.type === 'file') {
      references.push({
        id: imageEmbeddableInput.imageConfig.src.fileId,
        type: 'file',
        name: imageEmbeddableInput.imageConfig.src.fileId,
      });
    }

    return { state, references };
  }

  public inject(state: EmbeddableStateWithType, references: SavedObjectReference[]) {
    debugger;
    const imageEmbeddableInput = state as unknown as ImageEmbeddableInput & { type: string };

    if (imageEmbeddableInput.imageConfig?.src?.type === 'file') {
      imageEmbeddableInput.imageConfig.src.fileId = references.find(
        (r) =>
          imageEmbeddableInput.imageConfig?.src?.type === 'file' &&
          r.name === imageEmbeddableInput.imageConfig?.src?.fileId
      )?.id!;
    }
    return imageEmbeddableInput;
  }
}
